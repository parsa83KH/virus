// ==================== GLOBAL VARIABLES ====================
let scene, camera, renderer, particles;
let animationFrameId = null;
let isContextLost = false;
let lenis = null;

// Animation state management - pause animations when not visible
const animationStates = {
    lstm: { running: false, frameId: null },
    lstmSection: { running: false, frameId: null },
    transformer: { running: false, frameId: null },
    prediction: { running: false, frameId: null },
    intelligence: { running: false, frameId: null },
    ngs: { running: false, frameId: null },
    virus: { running: false, frameId: null },
    immuneEscape: { running: false, frameId: null },
    immuneMemory: { running: false, frameId: null },
    aiVaccine: { running: false, frameId: null },
    background: { running: true, frameId: null } // Keep background running
};

// IntersectionObserver to pause animations when not visible
function setupAnimationObserver(canvas, animationKey, animationFunction) {
    if (!canvas || !('IntersectionObserver' in window)) {
        // Fallback: start animation if IntersectionObserver not available
        animationStates[animationKey].running = true;
        animationFunction();
        return;
    }
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Start animation when visible
                if (!animationStates[animationKey].running) {
                    animationStates[animationKey].running = true;
                    animationFunction();
                }
            } else {
                // Stop animation when not visible
                if (animationStates[animationKey].running) {
                    animationStates[animationKey].running = false;
                    if (animationStates[animationKey].frameId) {
                        cancelAnimationFrame(animationStates[animationKey].frameId);
                        animationStates[animationKey].frameId = null;
                    }
                }
            }
        });
    }, {
        threshold: 0.1 // Start when at least 10% visible
    });
    
    observer.observe(canvas);
}

// ==================== THREE.JS BACKGROUND ====================
function cleanupThreeBackground() {
    // Stop animation loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Dispose of Three.js resources
    if (particles) {
        if (particles.geometry) particles.geometry.dispose();
        if (particles.material) particles.material.dispose();
        particles = null;
    }
    
    if (scene) {
        scene.clear();
        scene = null;
    }
    
    if (renderer) {
        const canvas = renderer.domElement;
        if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
        renderer.dispose();
        renderer = null;
    }
    
    camera = null;
}

function initThreeBackground() {
    // Clean up existing resources if any
    cleanupThreeBackground();
    
    isContextLost = false;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: false, // Disabled to reduce GPU load
        powerPreference: "low-power", // Changed to low-power to be gentler on GPU
        preserveDrawingBuffer: false
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limit pixel ratio to reduce load
    const container = document.getElementById('three-background');
    if (container) {
        container.appendChild(renderer.domElement);
    }
    
    // Handle context lost
    const canvas = renderer.domElement;
    canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        console.warn('WebGL context lost, attempting to restore...');
        isContextLost = true;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    });
    
    // Handle context restored
    canvas.addEventListener('webglcontextrestored', () => {
        console.log('WebGL context restored, reinitializing...');
        isContextLost = false;
        // Wait a bit then reinitialize
        setTimeout(() => {
            initThreeBackground();
        }, 100);
    });
    
    // Periodically check if context is lost
    checkContextLoss();
    
    // Create SIMPLIFIED particle system - much lighter weight
    const geometry = new THREE.BufferGeometry();
    const particleCount = 400; // Further reduced to 400 particles (was 1500)
    const positions = new Float32Array(particleCount * 3);
    
    // Distribute particles in a spherical shape (more space-efficient)
    for(let i = 0; i < particleCount; i++) {
        const radius = 40 + Math.random() * 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Simplified material - removed AdditiveBlending (expensive)
    const material = new THREE.PointsMaterial({
        color: 0x00ffff,
        size: 0.15, // Slightly larger since we have fewer particles
        transparent: true,
        opacity: 0.5, // Reduced opacity
        sizeAttenuation: true
        // No blending - default NormalBlending is much cheaper
    });
    
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
    
    camera.position.z = 50;
    
    lastFrameTime = performance.now();
    animateBackground(performance.now());
}

function checkContextLoss() {
    if (!renderer || !renderer.domElement) {
        // Renderer missing, try to reinitialize after delay
        setTimeout(checkContextLoss, 5000);
        return;
    }
    
    try {
        const gl = renderer.getContext();
        if (!gl) {
            // No context available
            if (!isContextLost) {
                console.warn('WebGL context unavailable');
                isContextLost = true;
            }
            setTimeout(checkContextLoss, 5000);
            return;
        }
        
        if (gl.isContextLost()) {
            if (!isContextLost) {
                console.warn('WebGL context detected as lost');
                isContextLost = true;
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
                // Clean up and wait for restore
                cleanupThreeBackground();
            }
        } else {
            isContextLost = false;
        }
    } catch (error) {
        console.error('Error checking context:', error);
        if (!isContextLost) {
            isContextLost = true;
            cleanupThreeBackground();
        }
    }
    
    // Check every 5 seconds
    setTimeout(checkContextLoss, 5000);
}

let lastFrameTime = 0;
const targetFPS = 30; // Limit to 30 FPS to reduce GPU load
const frameInterval = 1000 / targetFPS;

function animateBackground(currentTime) {
    if (isContextLost) {
        return; // Stop animation if context is lost
    }
    
    if (!renderer || !scene || !camera || !particles) {
        // If resources are missing, try to reinitialize
        setTimeout(() => {
            if (!isContextLost) {
                initThreeBackground();
            }
        }, 1000);
        return;
    }
    
    try {
        // Check if context is still valid before rendering
        const gl = renderer.getContext();
        if (gl && gl.isContextLost()) {
            isContextLost = true;
            return;
        }
        
        // Frame rate limiting - only render if enough time has passed
        if (!currentTime) {
            currentTime = performance.now();
        }
        const elapsed = currentTime - lastFrameTime;
        if (elapsed < frameInterval) {
            animationFrameId = requestAnimationFrame((time) => animateBackground(time));
            return;
        }
        
        lastFrameTime = currentTime - (elapsed % frameInterval);
        
        // Slower, smoother rotation (reduces per-frame computation)
        particles.rotation.y += 0.0001; // Reduced from 0.0002
        particles.rotation.x += 0.00005; // Reduced from 0.0001
    
    renderer.render(scene, camera);
        
        animationFrameId = requestAnimationFrame((time) => animateBackground(time));
    } catch (error) {
        console.error('Error in animateBackground:', error);
        // Try to recover
        isContextLost = true;
        setTimeout(() => {
            if (!isContextLost) {
                initThreeBackground();
            }
        }, 1000);
    }
}

// ==================== LENIS SMOOTH SCROLL ====================
function initLenis() {
    // Initialize Lenis smooth scroll
    lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
    });

    // Animation frame loop for Lenis
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
}

// ==================== GSAP SCROLL ANIMATIONS ====================
function initScrollAnimations() {
    gsap.registerPlugin(ScrollTrigger);
    
    // Configure ScrollTrigger to work with Lenis
    ScrollTrigger.scrollerProxy(document.body, {
        scrollTop(value) {
            if (arguments.length) {
                lenis.scrollTo(value, { immediate: true });
            }
            return lenis.scroll;
        },
        getBoundingClientRect() {
            return {
                top: 0,
                left: 0,
                width: window.innerWidth,
                height: window.innerHeight,
            };
        },
    });

    // Update ScrollTrigger when Lenis scrolls
    lenis.on('scroll', ScrollTrigger.update);

    // Refresh ScrollTrigger after setup
    ScrollTrigger.refresh();
    
    // Hero animations - all using fade in effect - faster timing
    // Fade in animation for main title
    setTimeout(() => {
        fadeInAnimation(document.querySelector('#hero h1'));
    }, 500);
    
    // Fade in animation for subtitle
    setTimeout(() => {
        fadeInAnimation(document.querySelector('#hero h2'));
    }, 1500);
    
    // Fade in animation for presenters
    setTimeout(() => {
        fadeInAnimation(document.querySelector('#hero .presenters'));
    }, 2500);
    
    // Introduction paragraphs
    gsap.utils.toArray('.intro-paragraph').forEach((para, i) => {
        gsap.to(para, {
            opacity: 1,
            y: 0,
            duration: 1,
            scrollTrigger: {
                trigger: para,
                start: 'top 80%',
                toggleActions: 'play none none none'
            }
        });
    });

    // Scientific content sections animations
    gsap.utils.toArray('.content-section').forEach((section, i) => {
        gsap.to(section, {
            opacity: 1,
            y: 0,
            duration: 1.2,
            scrollTrigger: {
                trigger: section,
                start: 'top 85%',
                toggleActions: 'play none none none',
                onEnter: () => {
                    // Fade in effect for each paragraph
                    const paragraphs = section.querySelectorAll('.scientific-text');
                    paragraphs.forEach((paragraph, index) => {
                        setTimeout(() => {
                            fadeInScientificText(paragraph);
                            // Animate keywords after fade in is complete
                            setTimeout(() => {
                                animateKeywordsInSection(section);
                            }, 2000);
                        }, index * 1000); // Shorter wait between paragraphs
                    });
                }
            }
        });
    });
}






// ==================== VISUAL DIAGRAMS CREATION ====================
function createVirusStructure() {
    const container = document.getElementById('virus-structure');
    if (!container) return;
    
    // Create virus particles
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'virus-particle';
        particle.style.left = Math.random() * 80 + 10 + '%';
        particle.style.top = Math.random() * 80 + 10 + '%';
        particle.style.animationDelay = Math.random() * 4 + 's';
        container.appendChild(particle);
    }
    
    // Create protein spikes
    for (let i = 0; i < 6; i++) {
        const spike = document.createElement('div');
        spike.style.position = 'absolute';
        spike.style.width = '3px';
        spike.style.height = '30px';
        spike.style.background = '#00ff88';
        spike.style.borderRadius = '2px';
        spike.style.boxShadow = '0 0 10px #00ff88';
        spike.style.left = Math.random() * 90 + 5 + '%';
        spike.style.top = Math.random() * 90 + 5 + '%';
        spike.style.animation = 'virusFloat 3s ease-in-out infinite';
        spike.style.animationDelay = Math.random() * 3 + 's';
        container.appendChild(spike);
    }
}

function createGeneticCode() {
    const container = document.getElementById('genetic-code');
    if (!container) return;
    
    const letters = ['A', 'T', 'G', 'C'];
    const positions = [
        { x: 20, y: 30 }, { x: 40, y: 20 }, { x: 60, y: 40 },
        { x: 30, y: 60 }, { x: 70, y: 50 }, { x: 50, y: 70 },
        { x: 15, y: 50 }, { x: 80, y: 30 }, { x: 25, y: 80 }
    ];
    
    positions.forEach((pos, i) => {
        const letter = document.createElement('div');
        letter.className = 'genetic-letter';
        letter.textContent = letters[i % letters.length];
        letter.style.left = pos.x + '%';
        letter.style.top = pos.y + '%';
        letter.style.animationDelay = i * 0.2 + 's';
        container.appendChild(letter);
    });
}

function createDataVisualization() {
    const container = document.getElementById('data-visualization');
    if (!container) return;
    
    // Create data points
    for (let i = 0; i < 15; i++) {
        const point = document.createElement('div');
        point.className = 'data-point';
        point.style.left = Math.random() * 90 + 5 + '%';
        point.style.top = Math.random() * 90 + 5 + '%';
        point.style.animationDelay = Math.random() * 3 + 's';
        container.appendChild(point);
    }
    
    // Create data streams
    for (let i = 0; i < 5; i++) {
        const stream = document.createElement('div');
        stream.style.position = 'absolute';
        stream.style.width = '2px';
        stream.style.height = '100px';
        stream.style.background = 'linear-gradient(to bottom, transparent, #ff6b6b, transparent)';
        stream.style.left = Math.random() * 90 + 5 + '%';
        stream.style.top = '0%';
        stream.style.animation = 'dataFlow 4s linear infinite';
        stream.style.animationDelay = Math.random() * 4 + 's';
        container.appendChild(stream);
    }
}

function createNeuralModels() {
    const container = document.getElementById('neural-models');
    if (!container) return;
    
    // Create neural network nodes
    const layers = [3, 5, 4, 2];
    layers.forEach((nodeCount, layerIndex) => {
        for (let i = 0; i < nodeCount; i++) {
            const node = document.createElement('div');
            node.className = 'neural-node';
            node.style.left = (layerIndex * 25 + 10) + '%';
            node.style.top = (i * (80 / (nodeCount - 1)) + 10) + '%';
            node.style.animationDelay = (layerIndex + i) * 0.1 + 's';
            container.appendChild(node);
        }
    });
}

// ==================== LSTM ANIMATION ====================
let lstmCanvas, lstmCtx;
let lstmSequences = [];
let lstmMemoryCells = [];
let lstmCurrentSequence = 0;
let lstmAnimationPhase = 0;
let lstmFrameCount = 0;
let lstmProcessingIndex = 0;

class LSTMSequence {
    constructor() {
        this.bases = ['A', 'U', 'G', 'C'];
        this.sequence = this.generateSequence();
        this.x = 0; // Will be calculated based on canvas width
        this.y = 100;
        this.width = 8;
        this.height = 30;
        this.items = [];
        this.processed = false;
        this.initializeItems();
    }

    generateSequence() {
        let seq = '';
        for (let i = 0; i < 8; i++) {
            seq += this.bases[Math.floor(Math.random() * 4)];
        }
        return seq;
    }

    initializeItems() {
        // Calculate sequence width and center it
        const sequenceWidth = (this.sequence.length - 1) * 40;
        const startX = (lstmCanvas.width - sequenceWidth) / 2;
        
        for (let i = 0; i < this.sequence.length; i++) {
            this.items.push({
                char: this.sequence[i],
                x: startX + i * 40,
                y: this.y,
                processed: false,
                alpha: 1,
                color: this.getBaseColor(this.sequence[i])
            });
        }
    }

    getBaseColor(base) {
        switch(base) {
            case 'A': return '#00ff88';
            case 'U': return '#ff0088';
            case 'G': return '#00ffff';
            case 'C': return '#ffff00';
            default: return '#ffffff';
        }
    }

    update() {
        this.items.forEach((item, index) => {
            if (index <= lstmProcessingIndex) {
                item.processed = true;
                item.alpha = 0.7;
            }
        });
    }

    draw() {
        lstmCtx.font = 'bold 20px Courier New';
        lstmCtx.textAlign = 'center';
        lstmCtx.textBaseline = 'middle';

        this.items.forEach((item, index) => {
            lstmCtx.globalAlpha = item.alpha;
            lstmCtx.fillStyle = item.color;
            
            // Add glow effect for processed items
            if (item.processed) {
                lstmCtx.shadowBlur = 15;
                lstmCtx.shadowColor = item.color;
            } else {
                lstmCtx.shadowBlur = 0;
            }
            
            lstmCtx.fillText(item.char, item.x, item.y);
            lstmCtx.globalAlpha = 1;
            lstmCtx.shadowBlur = 0;
        });
    }
}

class LSTMMemoryCell {
    constructor(x, y, id) {
        this.x = x;
        this.y = y;
        this.id = id;
        this.radius = 25;
        this.memory = 0;
        this.targetMemory = 0;
        this.forgetGate = 0;
        this.inputGate = 0;
        this.outputGate = 0;
        this.isActive = false;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.connections = [];
    }

    update() {
        this.pulsePhase += 0.05;
        
        // Smooth memory updates
        this.memory += (this.targetMemory - this.memory) * 0.1;
        this.forgetGate += (this.targetMemory > 0.5 ? 1 : 0 - this.forgetGate) * 0.1;
        this.inputGate += (this.targetMemory > 0.3 ? 1 : 0 - this.inputGate) * 0.1;
        this.outputGate += (this.targetMemory > 0.7 ? 1 : 0 - this.outputGate) * 0.1;
        
        this.isActive = this.memory > 0.1;
    }

    draw() {
        const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8;
        const currentRadius = this.radius * pulse;

        // Memory cell body
        lstmCtx.beginPath();
        lstmCtx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        
        // Gradient based on memory level
        const gradient = lstmCtx.createRadialGradient(this.x, this.y, 0, this.x, this.y, currentRadius);
        if (this.isActive) {
            gradient.addColorStop(0, `rgba(0, 255, 255, ${this.memory})`);
            gradient.addColorStop(1, `rgba(0, 255, 255, ${this.memory * 0.3})`);
        } else {
            gradient.addColorStop(0, 'rgba(100, 100, 100, 0.3)');
            gradient.addColorStop(1, 'rgba(100, 100, 100, 0.1)');
        }
        
        lstmCtx.fillStyle = gradient;
        lstmCtx.fill();

        // Border
        lstmCtx.strokeStyle = this.isActive ? '#00ffff' : '#666';
        lstmCtx.lineWidth = 2;
        lstmCtx.stroke();

        // Memory level indicator
        if (this.isActive) {
            const barWidth = 30;
            const barHeight = 4;
            const barX = this.x - barWidth / 2;
            const barY = this.y + currentRadius + 10;

            lstmCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            lstmCtx.fillRect(barX, barY, barWidth, barHeight);

            lstmCtx.fillStyle = '#00ffff';
            lstmCtx.fillRect(barX, barY, barWidth * this.memory, barHeight);
        }

        // Gates visualization
        this.drawGates();
    }

    drawGates() {
        const gateSize = 8;
        const gateY = this.y - this.radius - 15;
        
        // Forget gate
        lstmCtx.fillStyle = this.forgetGate > 0.5 ? '#ff6b6b' : '#666';
        lstmCtx.beginPath();
        lstmCtx.arc(this.x - 15, gateY, gateSize, 0, Math.PI * 2);
        lstmCtx.fill();

        // Input gate
        lstmCtx.fillStyle = this.inputGate > 0.5 ? '#4ecdc4' : '#666';
        lstmCtx.beginPath();
        lstmCtx.arc(this.x, gateY, gateSize, 0, Math.PI * 2);
        lstmCtx.fill();

        // Output gate
        lstmCtx.fillStyle = this.outputGate > 0.5 ? '#45b7d1' : '#666';
        lstmCtx.beginPath();
        lstmCtx.arc(this.x + 15, gateY, gateSize, 0, Math.PI * 2);
        lstmCtx.fill();
    }
}

class LSTMConnection {
    constructor(from, to) {
        this.from = from;
        this.to = to;
        this.alpha = 0;
        this.targetAlpha = 0;
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    update() {
        this.pulsePhase += 0.1;
        this.alpha += (this.targetAlpha - this.alpha) * 0.1;
    }

    draw() {
        if (this.alpha > 0.1) {
            lstmCtx.strokeStyle = `rgba(0, 255, 255, ${this.alpha})`;
            lstmCtx.lineWidth = 2;
            lstmCtx.setLineDash([5, 5]);
            
            // Animated dash offset
            const dashOffset = Math.sin(this.pulsePhase) * 10;
            lstmCtx.lineDashOffset = dashOffset;
            
            lstmCtx.beginPath();
            lstmCtx.moveTo(this.from.x, this.from.y);
            lstmCtx.lineTo(this.to.x, this.to.y);
            lstmCtx.stroke();
            
            lstmCtx.setLineDash([]);
        }
    }
}

function initLSTMAnimation() {
    lstmCanvas = document.getElementById('lstm-canvas');
    if (!lstmCanvas) return;
    
    lstmCtx = lstmCanvas.getContext('2d');
    
    // Set canvas size
    const container = lstmCanvas.parentElement;
    lstmCanvas.width = container.clientWidth;
    lstmCanvas.height = container.clientHeight;
    
    // Initialize sequences
    lstmSequences = [
        new LSTMSequence()
    ];
    
    // Initialize memory cells
    lstmMemoryCells = [];
    const cellSpacing = lstmCanvas.width / 4;
    for (let i = 0; i < 3; i++) {
        lstmMemoryCells.push(new LSTMMemoryCell(
            cellSpacing * (i + 1),
            lstmCanvas.height / 2,
            i + 1
        ));
    }
    
    // Initialize connections
    lstmConnections = [];
    for (let i = 0; i < lstmMemoryCells.length - 1; i++) {
        lstmConnections.push(new LSTMConnection(
            lstmMemoryCells[i],
            lstmMemoryCells[i + 1]
        ));
    }
    
    lstmAnimationPhase = 0;
    lstmFrameCount = 0;
    lstmProcessingIndex = -1;
    
    // Use IntersectionObserver to only animate when visible
    setupAnimationObserver(lstmCanvas, 'lstm', () => animateLSTM());
}

function animateLSTM() {
    // Check if animation should run
    if (!animationStates.lstm.running) {
        animationStates.lstm.frameId = null;
        return;
    }
    
    // Clear canvas - transparent background
    lstmCtx.clearRect(0, 0, lstmCanvas.width, lstmCanvas.height);

    lstmFrameCount++;

    // Animation phases
    switch(lstmAnimationPhase) {
        case 0: // Sequence processing
            if (lstmFrameCount % 30 === 0 && lstmProcessingIndex < 7) {
                lstmProcessingIndex++;
                
                // Activate corresponding memory cell
                if (lstmProcessingIndex < lstmMemoryCells.length) {
                    lstmMemoryCells[lstmProcessingIndex].targetMemory = 0.8;
                }
                
                // Activate connections
                if (lstmProcessingIndex > 0 && lstmProcessingIndex < lstmConnections.length + 1) {
                    lstmConnections[lstmProcessingIndex - 1].targetAlpha = 1;
                }
            }
            
            if (lstmProcessingIndex >= 7 && lstmFrameCount > 60) {
                lstmAnimationPhase = 1;
                lstmFrameCount = 0;
            }
            break;

        case 1: // Memory retention
            // Gradually reduce memory in earlier cells (forget gate)
            lstmMemoryCells.forEach((cell, index) => {
                if (index < lstmProcessingIndex - 2) {
                    cell.targetMemory = Math.max(0, cell.targetMemory - 0.02);
                }
            });
            
            if (lstmFrameCount > 120) {
                lstmAnimationPhase = 2;
                lstmFrameCount = 0;
            }
            break;

        case 2: // Pattern recognition
            // Simulate pattern recognition by pulsing all cells
            lstmMemoryCells.forEach(cell => {
                if (cell.memory > 0.3) {
                    cell.targetMemory = 0.5 + Math.sin(lstmFrameCount * 0.1) * 0.3;
                }
            });
            
            if (lstmFrameCount > 150) {
                lstmAnimationPhase = 3;
                lstmFrameCount = 0;
            }
            break;

        case 3: // Reset for next cycle
            lstmProcessingIndex = -1;
            lstmMemoryCells.forEach(cell => {
                cell.targetMemory = 0;
            });
            lstmConnections.forEach(conn => {
                conn.targetAlpha = 0;
            });
            
            // Generate new sequence
            lstmSequences[0] = new LSTMSequence();
            
            if (lstmFrameCount > 60) {
                lstmAnimationPhase = 0;
                lstmFrameCount = 0;
            }
            break;
    }

    // Update and draw
    lstmSequences.forEach(seq => {
        seq.update();
        seq.draw();
    });

    lstmMemoryCells.forEach(cell => {
        cell.update();
        cell.draw();
    });

    lstmConnections.forEach(conn => {
        conn.update();
        conn.draw();
    });

    // Draw processing indicator
    if (lstmAnimationPhase === 0 && lstmProcessingIndex >= 0) {
        const currentItem = lstmSequences[0].items[lstmProcessingIndex];
        if (currentItem) {
            // Connect to the middle memory cell
            const middleCell = lstmMemoryCells[Math.floor(lstmMemoryCells.length / 2)];
            lstmCtx.strokeStyle = '#00ffff';
            lstmCtx.lineWidth = 3;
            lstmCtx.setLineDash([10, 5]);
            lstmCtx.beginPath();
            lstmCtx.moveTo(currentItem.x, currentItem.y + 20);
            lstmCtx.lineTo(middleCell.x, middleCell.y - middleCell.radius - 20);
            lstmCtx.stroke();
            lstmCtx.setLineDash([]);
        }
    }

    animationStates.lstm.frameId = requestAnimationFrame(animateLSTM);
}

// ==================== LSTM SECTION ANIMATION ====================
let lstmSectionCanvas, lstmSectionCtx;
let lstmSectionMemoryCells = [];
let lstmSectionSequence = [];
let lstmSectionCurrentIndex = 0;
let lstmSectionAnimationPhase = 0;
let lstmSectionFrameCount = 0;
let lstmSectionProcessingSpeed = 1;

class LSTMSectionMemoryCell {
    constructor(x, y, id) {
        this.x = x;
        this.y = y;
        this.id = id;
        this.radius = 20;
        this.memory = 0;
        this.targetMemory = 0;
        this.isActive = false;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.connections = [];
        this.processedSequence = '';
    }

    update() {
        this.pulsePhase += 0.03;
        this.memory += (this.targetMemory - this.memory) * 0.1;
        this.isActive = this.memory > 0.1;
    }

    draw() {
        const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8;
        const currentRadius = this.radius * pulse;

        // Memory cell body
        lstmSectionCtx.beginPath();
        lstmSectionCtx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        
        // Gradient based on memory level
        const gradient = lstmSectionCtx.createRadialGradient(this.x, this.y, 0, this.x, this.y, currentRadius);
        if (this.isActive) {
            gradient.addColorStop(0, `rgba(0, 255, 255, ${this.memory})`);
            gradient.addColorStop(1, `rgba(0, 255, 255, ${this.memory * 0.3})`);
        } else {
            gradient.addColorStop(0, 'rgba(100, 100, 100, 0.3)');
            gradient.addColorStop(1, 'rgba(100, 100, 100, 0.1)');
        }
        
        lstmSectionCtx.fillStyle = gradient;
        lstmSectionCtx.fill();

        // Border
        lstmSectionCtx.strokeStyle = this.isActive ? '#00ffff' : '#666';
        lstmSectionCtx.lineWidth = 2;
        lstmSectionCtx.stroke();

        // Memory level indicator
        if (this.isActive) {
            const barWidth = 25;
            const barHeight = 3;
            const barX = this.x - barWidth / 2;
            const barY = this.y + currentRadius + 8;

            lstmSectionCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            lstmSectionCtx.fillRect(barX, barY, barWidth, barHeight);

            lstmSectionCtx.fillStyle = '#00ffff';
            lstmSectionCtx.fillRect(barX, barY, barWidth * this.memory, barHeight);
        }

        // Cell ID
        lstmSectionCtx.fillStyle = 'white';
        lstmSectionCtx.font = 'bold 12px Arial';
        lstmSectionCtx.textAlign = 'center';
        lstmSectionCtx.fillText(this.id, this.x, this.y + 4);
    }
}

class LSTMSectionSequenceItem {
    constructor(char, x, y) {
        this.char = char;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.processed = false;
        this.alpha = 1;
        this.color = this.getBaseColor(char);
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    getBaseColor(base) {
        switch(base) {
            case 'A': return '#00ff88';
            case 'U': return '#ff0088';
            case 'G': return '#00ffff';
            case 'C': return '#ffff00';
            default: return '#ffffff';
        }
    }

    update() {
        this.pulsePhase += 0.05;
        
        // Move towards target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        this.x += dx * 0.1;
        this.y += dy * 0.1;

        if (this.processed) {
            this.alpha = 0.6 + Math.sin(this.pulsePhase) * 0.2;
        }
    }

    draw() {
        const pulse = Math.sin(this.pulsePhase) * 0.1 + 0.9;
        
        lstmSectionCtx.globalAlpha = this.alpha;
        
        // Background circle
        lstmSectionCtx.beginPath();
        lstmSectionCtx.arc(this.x, this.y, 15 * pulse, 0, Math.PI * 2);
        lstmSectionCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        lstmSectionCtx.fill();
        
        // Character
        lstmSectionCtx.fillStyle = this.color;
        lstmSectionCtx.font = 'bold 16px Courier New';
        lstmSectionCtx.textAlign = 'center';
        lstmSectionCtx.textBaseline = 'middle';
        lstmSectionCtx.shadowBlur = this.processed ? 10 : 0;
        lstmSectionCtx.shadowColor = this.color;
        lstmSectionCtx.fillText(this.char, this.x, this.y);
        
        lstmSectionCtx.globalAlpha = 1;
        lstmSectionCtx.shadowBlur = 0;
    }
}

function initLSTMSectionAnimation() {
    lstmSectionCanvas = document.getElementById('lstm-section-canvas');
    if (!lstmSectionCanvas) return;
    
    lstmSectionCtx = lstmSectionCanvas.getContext('2d');
    
    // Set canvas size
    const container = lstmSectionCanvas.parentElement;
    lstmSectionCanvas.width = container.clientWidth;
    lstmSectionCanvas.height = container.clientHeight;
    
    // Initialize memory cells
    lstmSectionMemoryCells = [];
    const cellSpacing = lstmSectionCanvas.width / 5;
    for (let i = 0; i < 4; i++) {
        lstmSectionMemoryCells.push(new LSTMSectionMemoryCell(
            cellSpacing * (i + 1),
            lstmSectionCanvas.height / 2,
            i + 1
        ));
    }
    
    // Initialize sequence
    const sequence = 'AUGCAUCG';
    lstmSectionSequence = [];
    const startX = 50;
    const startY = 80;
    
    for (let i = 0; i < sequence.length; i++) {
        lstmSectionSequence.push(new LSTMSectionSequenceItem(
            sequence[i],
            startX + i * 40,
            startY
        ));
    }
    
    lstmSectionCurrentIndex = 0;
    lstmSectionAnimationPhase = 0;
    lstmSectionFrameCount = 0;
    
    // Use IntersectionObserver to only animate when visible
    setupAnimationObserver(lstmSectionCanvas, 'lstmSection', () => animateLSTMSection());
}

function animateLSTMSection() {
    // Check if animation should run
    if (!animationStates.lstmSection.running) {
        animationStates.lstmSection.frameId = null;
        return;
    }
    
    // Clear canvas - transparent background
    lstmSectionCtx.clearRect(0, 0, lstmSectionCanvas.width, lstmSectionCanvas.height);

    lstmSectionFrameCount++;

    // Animation phases
    switch(lstmSectionAnimationPhase) {
        case 0: // Sequence processing
            if (lstmSectionFrameCount % 40 === 0 && lstmSectionCurrentIndex < lstmSectionSequence.length) {
                const currentItem = lstmSectionSequence[lstmSectionCurrentIndex];
                const targetCell = lstmSectionMemoryCells[lstmSectionCurrentIndex % lstmSectionMemoryCells.length];
                
                // Move sequence item to memory cell
                currentItem.targetX = targetCell.x;
                currentItem.targetY = targetCell.y - 50;
                currentItem.processed = true;
                
                // Activate memory cell
                targetCell.targetMemory = 0.8;
                targetCell.processedSequence += currentItem.char;
                
                lstmSectionCurrentIndex++;
            }
            
            if (lstmSectionCurrentIndex >= lstmSectionSequence.length && lstmSectionFrameCount > 60) {
                lstmSectionAnimationPhase = 1;
                lstmSectionFrameCount = 0;
            }
            break;

        case 1: // Pattern recognition
            // All memory cells pulse together
            lstmSectionMemoryCells.forEach(cell => {
                if (cell.memory > 0.3) {
                    cell.targetMemory = 0.5 + Math.sin(lstmSectionFrameCount * 0.1) * 0.3;
                }
            });
            
            if (lstmSectionFrameCount > 120) {
                lstmSectionAnimationPhase = 2;
                lstmSectionFrameCount = 0;
            }
            break;

        case 2: // Prediction phase
            // Show prediction result
            lstmSectionMemoryCells.forEach(cell => {
                cell.targetMemory = 1.0;
            });
            
            if (lstmSectionFrameCount > 100) {
                lstmSectionAnimationPhase = 3;
                lstmSectionFrameCount = 0;
            }
            break;

        case 3: // Reset
            lstmSectionCurrentIndex = 0;
            lstmSectionMemoryCells.forEach(cell => {
                cell.targetMemory = 0;
                cell.processedSequence = '';
            });
            lstmSectionSequence.forEach(item => {
                item.processed = false;
                item.targetX = 50 + lstmSectionSequence.indexOf(item) * 40;
                item.targetY = 80;
            });
            
            if (lstmSectionFrameCount > 60) {
                lstmSectionAnimationPhase = 0;
                lstmSectionFrameCount = 0;
            }
            break;
    }

    // Update and draw
    lstmSectionMemoryCells.forEach(cell => {
        cell.update();
        cell.draw();
    });

    lstmSectionSequence.forEach(item => {
        item.update();
        item.draw();
    });

    // Draw connections
    lstmSectionMemoryCells.forEach((cell, index) => {
        if (index < lstmSectionMemoryCells.length - 1) {
            const nextCell = lstmSectionMemoryCells[index + 1];
            lstmSectionCtx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
            lstmSectionCtx.lineWidth = 1;
            lstmSectionCtx.beginPath();
            lstmSectionCtx.moveTo(cell.x + cell.radius, cell.y);
            lstmSectionCtx.lineTo(nextCell.x - nextCell.radius, nextCell.y);
            lstmSectionCtx.stroke();
        }
    });

    animationStates.lstmSection.frameId = requestAnimationFrame(animateLSTMSection);
}

// ==================== TRANSFORMER ANIMATION ====================
let transformerCanvas, transformerCtx;
let transformerLayers = [];
let transformerConnections = [];
let transformerAnimationPhase = 0;
let transformerFrameCount = 0;
let transformerDataFlow = [];

class TransformerLayer {
    constructor(x, y, layerType, nodeCount) {
        this.x = x;
        this.y = y;
        this.layerType = layerType;
        this.nodeCount = nodeCount;
        this.nodes = [];
        this.isActive = false;
        this.activationLevel = 0;
        this.initializeNodes();
    }

    initializeNodes() {
        const nodeSpacing = 40;
        const startY = this.y - (this.nodeCount - 1) * nodeSpacing / 2;
        
        for (let i = 0; i < this.nodeCount; i++) {
            this.nodes.push({
                x: this.x,
                y: startY + i * nodeSpacing,
                activation: 0,
                targetActivation: 0,
                color: this.getNodeColor(0),
                pulsePhase: Math.random() * Math.PI * 2,
                size: this.layerType === 'input' ? 8 : 12
            });
        }
    }

    getNodeColor(activation) {
        if (activation > 0.7) return '#ffffff';
        if (activation > 0.4) return '#cccccc';
        return '#333333';
    }

    update() {
        this.nodes.forEach(node => {
            node.pulsePhase += 0.05;
            node.activation += (node.targetActivation - node.activation) * 0.1;
            node.color = this.getNodeColor(node.activation);
        });
    }

    draw() {
        this.nodes.forEach(node => {
            const pulse = Math.sin(node.pulsePhase) * 0.1 + 0.9;
            const currentSize = node.size * pulse * (0.5 + node.activation * 0.5);

            // Node body
            transformerCtx.beginPath();
            transformerCtx.arc(node.x, node.y, currentSize, 0, Math.PI * 2);
            transformerCtx.fillStyle = node.color;
            transformerCtx.fill();

            // Glow effect for active nodes
            if (node.activation > 0.3) {
                transformerCtx.beginPath();
                transformerCtx.arc(node.x, node.y, currentSize * 2, 0, Math.PI * 2);
                const gradient = transformerCtx.createRadialGradient(node.x, node.y, 0, node.x, node.y, currentSize * 2);
                gradient.addColorStop(0, `rgba(0, 255, 255, ${node.activation * 0.3})`);
                gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
                transformerCtx.fillStyle = gradient;
                transformerCtx.fill();
            }

            // Border
            transformerCtx.beginPath();
            transformerCtx.arc(node.x, node.y, currentSize, 0, Math.PI * 2);
            transformerCtx.strokeStyle = node.activation > 0.5 ? '#00ffff' : '#666';
            transformerCtx.lineWidth = 1;
            transformerCtx.stroke();
        });
    }

    activateRandomNodes(count) {
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * this.nodes.length);
            this.nodes[randomIndex].targetActivation = 0.8 + Math.random() * 0.2;
        }
    }

    reset() {
        this.nodes.forEach(node => {
            node.targetActivation = 0;
        });
    }
}

class TransformerConnection {
    constructor(fromNode, toNode, weight) {
        this.fromNode = fromNode;
        this.toNode = toNode;
        this.weight = weight;
        this.alpha = 0;
        this.targetAlpha = 0;
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    update() {
        this.pulsePhase += 0.1;
        this.alpha += (this.targetAlpha - this.alpha) * 0.1;
    }

    draw() {
        if (this.alpha > 0.01) {
            const lineWidth = Math.abs(this.weight) * 3;
            const color = this.weight > 0 ? '#00ffff' : '#ff4444';
            
            transformerCtx.strokeStyle = color;
            transformerCtx.lineWidth = lineWidth;
            transformerCtx.globalAlpha = this.alpha;
            
            // Animated dash effect
            const dashOffset = Math.sin(this.pulsePhase) * 10;
            transformerCtx.setLineDash([5, 5]);
            transformerCtx.lineDashOffset = dashOffset;
            
            transformerCtx.beginPath();
            transformerCtx.moveTo(this.fromNode.x, this.fromNode.y);
            transformerCtx.lineTo(this.toNode.x, this.toNode.y);
            transformerCtx.stroke();
            
            transformerCtx.setLineDash([]);
            transformerCtx.globalAlpha = 1;
        }
    }
}

function initTransformerAnimation() {
    transformerCanvas = document.getElementById('transformer-canvas');
    if (!transformerCanvas) return;
    
    transformerCtx = transformerCanvas.getContext('2d');
    
    // Set canvas size
    const container = transformerCanvas.parentElement;
    transformerCanvas.width = container.clientWidth;
    transformerCanvas.height = container.clientHeight;
    
    // Initialize layers
    transformerLayers = [];
    const layerSpacing = transformerCanvas.width / 5;
    
    // Input layer (3D perspective effect)
    transformerLayers.push(new TransformerLayer(layerSpacing, transformerCanvas.height / 2, 'input', 10));
    
    // Hidden layers
    transformerLayers.push(new TransformerLayer(layerSpacing * 2, transformerCanvas.height / 2, 'hidden', 7));
    transformerLayers.push(new TransformerLayer(layerSpacing * 3, transformerCanvas.height / 2, 'hidden', 7));
    
    // Output layer
    transformerLayers.push(new TransformerLayer(layerSpacing * 4, transformerCanvas.height / 2, 'output', 7));
    
    // Initialize connections
    transformerConnections = [];
    for (let i = 0; i < transformerLayers.length - 1; i++) {
        const currentLayer = transformerLayers[i];
        const nextLayer = transformerLayers[i + 1];
        
        currentLayer.nodes.forEach(fromNode => {
            nextLayer.nodes.forEach(toNode => {
                const weight = (Math.random() - 0.5) * 2; // Random weight between -1 and 1
                transformerConnections.push(new TransformerConnection(fromNode, toNode, weight));
            });
        });
    }
    
    transformerAnimationPhase = 0;
    transformerFrameCount = 0;
    
    // Use IntersectionObserver to only animate when visible
    setupAnimationObserver(transformerCanvas, 'transformer', () => animateTransformer());
}

function animateTransformer() {
    // Check if animation should run
    if (!animationStates.transformer.running) {
        animationStates.transformer.frameId = null;
        return;
    }
    
    // Clear canvas - transparent background
    transformerCtx.clearRect(0, 0, transformerCanvas.width, transformerCanvas.height);

    transformerFrameCount++;

    // Animation phases
    switch(transformerAnimationPhase) {
        case 0: // Data input
            if (transformerFrameCount % 30 === 0) {
                transformerLayers[0].activateRandomNodes(3);
            }
            
            if (transformerFrameCount > 120) {
                transformerAnimationPhase = 1;
                transformerFrameCount = 0;
            }
            break;

        case 1: // Attention mechanism
            // Activate connections based on attention
            transformerConnections.forEach(conn => {
                if (conn.fromNode.activation > 0.3) {
                    conn.targetAlpha = Math.abs(conn.weight) * 0.8;
                } else {
                    conn.targetAlpha = 0;
                }
            });
            
            // Propagate activation to next layer
            if (transformerFrameCount % 20 === 0) {
                transformerLayers[1].activateRandomNodes(4);
            }
            
            if (transformerFrameCount > 100) {
                transformerAnimationPhase = 2;
                transformerFrameCount = 0;
            }
            break;

        case 2: // Deep processing
            // Continue attention flow
            transformerConnections.forEach(conn => {
                if (conn.fromNode.activation > 0.3) {
                    conn.targetAlpha = Math.abs(conn.weight) * 0.8;
                } else {
                    conn.targetAlpha = 0;
                }
            });
            
            // Activate deeper layers
            if (transformerFrameCount % 25 === 0) {
                transformerLayers[2].activateRandomNodes(5);
            }
            
            if (transformerFrameCount > 120) {
                transformerAnimationPhase = 3;
                transformerFrameCount = 0;
            }
            break;

        case 3: // Output generation
            // Full attention activation
            transformerConnections.forEach(conn => {
                if (conn.fromNode.activation > 0.2) {
                    conn.targetAlpha = Math.abs(conn.weight) * 1.0;
                } else {
                    conn.targetAlpha = 0;
                }
            });
            
            // Generate output
            transformerLayers[3].activateRandomNodes(3);
            
            if (transformerFrameCount > 100) {
                transformerAnimationPhase = 4;
                transformerFrameCount = 0;
            }
            break;

        case 4: // Reset
            transformerLayers.forEach(layer => layer.reset());
            transformerConnections.forEach(conn => conn.targetAlpha = 0);
            
            if (transformerFrameCount > 60) {
                transformerAnimationPhase = 0;
                transformerFrameCount = 0;
            }
            break;
    }

    // Update and draw
    transformerLayers.forEach(layer => {
        layer.update();
        layer.draw();
    });

    transformerConnections.forEach(conn => {
        conn.update();
        conn.draw();
    });

    animationStates.transformer.frameId = requestAnimationFrame(animateTransformer);
}

function createTransformerDemo() {
    // This function is now replaced by initTransformerAnimation
    initTransformerAnimation();
}

// ==================== PREDICTION ANIMATION ====================
// Animated dual-line chart (Actual vs Predicted) for a biological metric
let predictionCanvas, predictionCtx;
let bioActualSeries = [];
let bioPredSeries = [];
let predictionProgress = 0; // 0..1 how much of the line is drawn
let predictionSpeed = 0.006; // drawing speed per frame

function generateBiologicalSeries(length) {
    // Generate varied biological-like signals with different patterns each time
    const series = [];
    
    // Random parameters for each generation
    const startValue = Math.random() * 0.4 + 0.3; // start in [0.3, 0.7]
    const trendStrength = Math.random() * 0.02 + 0.005; // [0.005, 0.025]
    const trendDirection = Math.random() > 0.5 ? 1 : -1;
    const noiseLevel = Math.random() * 0.02 + 0.01; // [0.01, 0.03]
    const periodicFreq1 = Math.random() * 0.1 + 0.05; // [0.05, 0.15]
    const periodicFreq2 = Math.random() * 0.05 + 0.02; // [0.02, 0.07]
    const periodicAmp1 = Math.random() * 0.03 + 0.01; // [0.01, 0.04]
    const periodicAmp2 = Math.random() * 0.02 + 0.005; // [0.005, 0.025]
    const spikeProbability = Math.random() * 0.1 + 0.05; // [0.05, 0.15]
    const spikeIntensity = Math.random() * 0.2 + 0.1; // [0.1, 0.3]
    
    let value = startValue;
    for (let i = 0; i < length; i++) {
        // Base trend
        const trend = trendDirection * trendStrength;
        
        // Periodic components
        const periodic1 = Math.sin(i * periodicFreq1) * periodicAmp1;
        const periodic2 = Math.sin(i * periodicFreq2) * periodicAmp2;
        
        // Random noise
        const noise = (Math.random() - 0.5) * noiseLevel;
        
        // Occasional spikes
        let spike = 0;
        if (Math.random() < spikeProbability) {
            spike = (Math.random() - 0.5) * spikeIntensity;
        }
        
        // Combine all components
        value = Math.max(0, Math.min(1, value + trend + periodic1 + periodic2 + noise + spike));
        series.push(value);
    }
    return series;
}

function regeneratePredictionData() {
    const points = 180; // number of points on the x-axis
    bioActualSeries = generateBiologicalSeries(points);
    
    // Generate varied prediction patterns
    const predictionAccuracy = Math.random() * 0.4 + 0.6; // [0.6, 1.0] - how close to actual
    const predictionLag = Math.floor(Math.random() * 8) + 2; // [2, 9] - prediction delay
    const predictionNoise = Math.random() * 0.03 + 0.01; // [0.01, 0.04] - prediction noise
    const predictionBias = (Math.random() - 0.5) * 0.1; // [-0.05, 0.05] - systematic bias
    const predictionSmoothing = Math.random() * 0.3 + 0.2; // [0.2, 0.5] - how much smoothing
    
    bioPredSeries = bioActualSeries.map((v, i) => {
        // Use past values for prediction (simulating real prediction lag)
        const lagIdx = Math.max(0, i - predictionLag);
        const pastValue = bioActualSeries[lagIdx];
        
        // Mix current and past with smoothing
        const base = (pastValue * predictionSmoothing + v * (1 - predictionSmoothing));
        
        // Apply accuracy factor
        const accurate = base * predictionAccuracy + v * (1 - predictionAccuracy);
        
        // Add bias and noise
        const noise = (Math.random() - 0.5) * predictionNoise;
        const biased = accurate + predictionBias;
        
        return Math.max(0, Math.min(1, biased + noise));
    });
    
    predictionProgress = 0;
}

function initPredictionAnimation() {
    predictionCanvas = document.getElementById('prediction-canvas');
    if (!predictionCanvas) return;
    
    predictionCtx = predictionCanvas.getContext('2d');
    
    // Set canvas size
    const container = predictionCanvas.parentElement;
    predictionCanvas.width = container.clientWidth;
    predictionCanvas.height = container.clientHeight;
    
    regeneratePredictionData();
    // Use IntersectionObserver to only animate when visible
    setupAnimationObserver(predictionCanvas, 'prediction', () => animatePrediction());
}

function drawGrid() {
    const w = predictionCanvas.width;
    const h = predictionCanvas.height;
    const margin = 30;
    const plotW = w - margin * 2;
    const plotH = h - margin * 2;

    predictionCtx.strokeStyle = 'rgba(255,255,255,0.08)';
    predictionCtx.lineWidth = 1;
    // Outer border
    predictionCtx.strokeRect(margin, margin, plotW, plotH);
    // Vertical grid lines
    const vLines = 6;
    for (let i = 1; i < vLines; i++) {
        const x = margin + (plotW * i) / vLines;
        predictionCtx.beginPath();
        predictionCtx.moveTo(x, margin);
        predictionCtx.lineTo(x, margin + plotH);
        predictionCtx.stroke();
    }
    // Horizontal grid lines
    const hLines = 4;
    for (let i = 1; i < hLines; i++) {
        const y = margin + (plotH * i) / hLines;
        predictionCtx.beginPath();
        predictionCtx.moveTo(margin, y);
        predictionCtx.lineTo(margin + plotW, y);
        predictionCtx.stroke();
    }
}

function drawSeries(series, color) {
    const w = predictionCanvas.width;
    const h = predictionCanvas.height;
    const margin = 30;
    const plotW = w - margin * 2;
    const plotH = h - margin * 2;
    const n = series.length;

    const maxIndex = Math.max(1, Math.floor(n * predictionProgress));

    predictionCtx.strokeStyle = color;
    predictionCtx.lineWidth = 2;
    predictionCtx.beginPath();
    for (let i = 0; i < maxIndex; i++) {
        const x = margin + (plotW * i) / (n - 1);
        const y = margin + (1 - series[i]) * plotH; // invert because canvas y grows downward
        if (i === 0) predictionCtx.moveTo(x, y);
        else predictionCtx.lineTo(x, y);
    }
    predictionCtx.stroke();

    // Subtle glow
    predictionCtx.shadowBlur = 10;
    predictionCtx.shadowColor = color;
    predictionCtx.stroke();
    predictionCtx.shadowBlur = 0;
}

function animatePrediction() {
    // Check if animation should run
    if (!animationStates.prediction.running) {
        animationStates.prediction.frameId = null;
        return;
    }
    predictionCtx.clearRect(0, 0, predictionCanvas.width, predictionCanvas.height);

    drawGrid();

    // Draw Actual (green) first, then Predicted (red) on top
    drawSeries(bioActualSeries, '#00ff66');
    drawSeries(bioPredSeries, '#ff4444');

    predictionProgress += predictionSpeed;
    if (predictionProgress >= 1) {
        // Pause briefly at the end, then regenerate data
        if (predictionProgress < 1.15) {
            predictionProgress += predictionSpeed * 0.3; // short hold
        } else {
            regeneratePredictionData();
        }
    }

    animationStates.prediction.frameId = requestAnimationFrame(animatePrediction);
}

function createPredictionDemo() {
    initPredictionAnimation();
}

// Initialize all visual diagrams
function initVisualDiagrams() {
    createVirusStructure();
    createGeneticCode();
    createDataVisualization();
    createNeuralModels();
    createLSTMDemo();
    createTransformerDemo();
    createPredictionDemo();
}

// ==================== KEYWORD ANIMATION ====================
function animateKeywordsInSection(section) {
    const keywords = section.querySelectorAll('.keyword, .highlight');
    
    keywords.forEach((keyword, index) => {
        setTimeout(() => {
            keyword.classList.add('animate-underline');
            
            // Add a subtle glow effect
            gsap.to(keyword, {
                textShadow: '0 0 15px currentColor',
                duration: 0.5,
                yoyo: true,
                repeat: 1
            });
        }, index * 300); // Slower stagger for better visibility
    });
}

// ==================== TYPEWRITER ANIMATION ====================
function typewriterEffect(element, speed = 30) {
    const originalHTML = element.innerHTML;
    element.innerHTML = '';
    element.style.borderRight = '2px solid #00ff88';
    element.style.opacity = '1'; // Make element visible
    
    // Create a temporary element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = originalHTML;
    
    let currentText = '';
    let currentIndex = 0;
    const fullText = tempDiv.textContent || tempDiv.innerText || '';
    
    const timer = setInterval(() => {
        if (currentIndex < fullText.length) {
            currentText += fullText.charAt(currentIndex);
            element.innerHTML = currentText;
            currentIndex++;
        } else {
            clearInterval(timer);
            // Restore original HTML with keywords
            element.innerHTML = originalHTML;
            // Remove cursor after typing is complete
            setTimeout(() => {
                element.style.borderRight = 'none';
                // Wait a bit more before animating keywords
                setTimeout(() => {
                    animateKeywordsInSection(element.closest('.content-section'));
                }, 1000);
            }, 500);
        }
    }, speed);
}


// ==================== WORD FADE ANIMATION ====================
function wordFadeAnimation(element) {
    const text = element.textContent;
    const words = text.split(' ');
    element.innerHTML = '';
    
    words.forEach((word, index) => {
        const span = document.createElement('span');
        span.textContent = word + ' ';
        span.classList.add('word-fade');
        element.appendChild(span);
        
        setTimeout(() => {
            span.classList.add('animate');
        }, index * 200);
    });
}

// ==================== FADE IN ANIMATION ====================
function fadeInAnimation(element) {
    const text = element.textContent;
    const words = text.split(' ');
    element.innerHTML = '';
    
    words.forEach((word, index) => {
        const span = document.createElement('span');
        span.textContent = word + ' ';
        span.style.opacity = '0';
        span.style.transition = 'opacity 0.6s ease-in-out';
        span.style.transitionDelay = `${index * 80}ms`;
        element.appendChild(span);
        
        // Use setTimeout to trigger the animation after a small delay
        setTimeout(() => {
            span.style.opacity = '1';
        }, 50);
    });
    
    // Make the parent element visible
    element.style.opacity = '1';
}

// ==================== FADE IN ANIMATION FOR SCIENTIFIC TEXTS ====================
function fadeInScientificText(element) {
    // Make the element visible first
    element.style.opacity = '1';
    
    // Add a subtle fade-in effect to the entire paragraph
    element.style.transition = 'opacity 1.5s ease-in-out';
    element.style.opacity = '0';
    
    setTimeout(() => {
        element.style.opacity = '1';
    }, 100);
}

// ==================== SLIDE IN ANIMATION ====================
function slideInAnimation(element) {
    const text = element.textContent;
    const words = text.split(' ');
    element.innerHTML = '';
    
    words.forEach((word, index) => {
        const wordContainer = document.createElement('span');
        wordContainer.style.display = 'inline-block';
        wordContainer.style.overflow = 'hidden';
        
        const wordSpan = document.createElement('span');
        wordSpan.textContent = word + ' ';
        wordSpan.style.display = 'inline-block';
        wordSpan.style.transform = 'translateY(100%)';
        wordSpan.style.opacity = '0';
        wordSpan.style.transition = 'all 0.5s ease-out';
        
        wordContainer.appendChild(wordSpan);
        element.appendChild(wordContainer);
        
        setTimeout(() => {
            wordSpan.style.transform = 'translateY(0)';
            wordSpan.style.opacity = '1';
        }, index * 100);
    });
}

// ==================== REVEAL ANIMATION ====================
function revealAnimation(element) {
    element.classList.add('reveal-text');
}

// ==================== CONTENT LOADING ====================
function populateContent() {
    // Content is now directly in HTML, no need to load from JSON
    // Just set the page title
    document.title = "هوش مصنوعی در مدل‌سازی رفتار مولکولی ویروس‌ها";
}

// ==================== VIRUS INTELLIGENCE ANIMATION ====================
let intelligenceCanvas, intelligenceCtx;
let intelligenceDnaStrands = [];
let intelligenceNeurons = [];
let intelligenceConnections = [];
let intelligenceCurrentPhase = 1;
let intelligenceSpeedMultiplier = 1.0;

const DNA_BASES = ['A', 'T', 'G', 'C'];


class DNAStrand {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.points = [];
        this.length = 150;
        this.amplitude = 30;
        this.frequency = 0.05;
        this.phase = 0;
        this.sequence = this.generateSequence();
        
        for (let i = 0; i < this.length; i++) {
            this.points.push({x: 0, y: 0, base: this.sequence[i % this.sequence.length]});
        }
    }

    generateSequence() {
        let seq = '';
        for (let i = 0; i < 20; i++) {
            seq += DNA_BASES[Math.floor(Math.random() * DNA_BASES.length)];
        }
        return seq;
    }

    update() {
        this.phase += 0.02 * intelligenceSpeedMultiplier;
    }

    draw() {
        intelligenceCtx.save();
        intelligenceCtx.translate(this.x, this.y);

        for (let i = 0; i < this.points.length; i++) {
            const t = i / this.length;
            const x = i * 3 - this.length * 1.5;
            const y1 = Math.sin(t * Math.PI * 4 + this.phase) * this.amplitude;
            const y2 = Math.sin(t * Math.PI * 4 + this.phase + Math.PI) * this.amplitude;

            // رشته اول - نازک‌تر و ظریف‌تر
            intelligenceCtx.beginPath();
            intelligenceCtx.arc(x, y1, 2, 0, Math.PI * 2);
            intelligenceCtx.fillStyle = '#00aaff';
            intelligenceCtx.fill();
            
            // هاله برای رشته اول
            intelligenceCtx.beginPath();
            intelligenceCtx.arc(x, y1, 4, 0, Math.PI * 2);
            intelligenceCtx.fillStyle = 'rgba(0, 170, 255, 0.2)';
            intelligenceCtx.fill();

            // رشته دوم - نازک‌تر و ظریف‌تر
            intelligenceCtx.beginPath();
            intelligenceCtx.arc(x, y2, 2, 0, Math.PI * 2);
            intelligenceCtx.fillStyle = '#ff00aa';
            intelligenceCtx.fill();
            
            // هاله برای رشته دوم
            intelligenceCtx.beginPath();
            intelligenceCtx.arc(x, y2, 4, 0, Math.PI * 2);
            intelligenceCtx.fillStyle = 'rgba(255, 0, 170, 0.2)';
            intelligenceCtx.fill();

            // اتصال - نازک‌تر و ظریف‌تر
            if (i % 5 === 0) {
                intelligenceCtx.beginPath();
                intelligenceCtx.moveTo(x, y1);
                intelligenceCtx.lineTo(x, y2);
                intelligenceCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                intelligenceCtx.lineWidth = 1;
                intelligenceCtx.stroke();

                // نمایش باز - بزرگتر و واضح‌تر
                const base = this.points[i].base;
                const baseY = (y1 + y2) / 2;
                
                // پس‌زمینه برای متن
                intelligenceCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                intelligenceCtx.fillRect(x - 8, baseY - 8, 16, 16);
                
                // متن نوکلئوتید
                intelligenceCtx.fillStyle = this.getBaseColor(base);
                intelligenceCtx.font = 'bold 12px Courier New';
                intelligenceCtx.textAlign = 'center';
                intelligenceCtx.textBaseline = 'middle';
                intelligenceCtx.fillText(base, x, baseY);
                
                // هاله برای متن
                intelligenceCtx.shadowBlur = 10;
                intelligenceCtx.shadowColor = this.getBaseColor(base);
                intelligenceCtx.fillText(base, x, baseY);
                intelligenceCtx.shadowBlur = 0;
            }
        }

        intelligenceCtx.restore();
    }
    
    getBaseColor(base) {
        switch(base) {
            case 'A': return '#00ff88';
            case 'T': return '#ff0088';
            case 'G': return '#00ffff';
            case 'C': return '#ffff00';
            default: return '#ffffff';
        }
    }
}

class IntelligenceNeuron {
    constructor(x, y, layer) {
        this.x = x;
        this.y = y;
        this.layer = layer;
        this.radius = 15;
        this.activation = Math.random();
        this.targetActivation = Math.random();
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    update() {
        this.activation += (this.targetActivation - this.activation) * 0.05;
        this.pulsePhase += 0.05 * intelligenceSpeedMultiplier;
        
        if (Math.random() < 0.01) {
            this.targetActivation = Math.random();
        }
    }

    draw() {
        const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
        const currentRadius = this.radius * pulse;

        intelligenceCtx.beginPath();
        intelligenceCtx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        const gradient = intelligenceCtx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, currentRadius
        );
        const alpha = this.activation;
        gradient.addColorStop(0, `rgba(0, 255, 136, ${alpha})`);
        gradient.addColorStop(0.7, `rgba(0, 255, 136, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(0, 255, 136, 0)`);
        intelligenceCtx.fillStyle = gradient;
        intelligenceCtx.fill();

        intelligenceCtx.beginPath();
        intelligenceCtx.arc(this.x, this.y, currentRadius * 0.6, 0, Math.PI * 2);
        intelligenceCtx.fillStyle = `rgba(0, 255, 136, ${alpha * 0.8})`;
        intelligenceCtx.fill();
    }
}

class IntelligenceConnection {
    constructor(from, to) {
        this.from = from;
        this.to = to;
        this.weight = Math.random();
        this.signalPos = 0;
        this.signalActive = false;
    }

    update() {
        if (this.signalActive) {
            this.signalPos += 0.05 * intelligenceSpeedMultiplier;
            if (this.signalPos >= 1) {
                this.signalPos = 0;
                this.signalActive = false;
                this.to.targetActivation = Math.random();
            }
        }
        
        if (Math.random() < 0.005 && !this.signalActive) {
            this.signalActive = true;
            this.signalPos = 0;
        }
    }

    draw() {
        const alpha = this.weight * 0.3;
        intelligenceCtx.beginPath();
        intelligenceCtx.moveTo(this.from.x, this.from.y);
        intelligenceCtx.lineTo(this.to.x, this.to.y);
        intelligenceCtx.strokeStyle = `rgba(0, 255, 136, ${alpha})`;
        intelligenceCtx.lineWidth = 1;
        intelligenceCtx.stroke();

        if (this.signalActive) {
            const x = this.from.x + (this.to.x - this.from.x) * this.signalPos;
            const y = this.from.y + (this.to.y - this.from.y) * this.signalPos;
            
            intelligenceCtx.beginPath();
            intelligenceCtx.arc(x, y, 4, 0, Math.PI * 2);
            intelligenceCtx.fillStyle = '#00ff88';
            intelligenceCtx.fill();
            
            intelligenceCtx.beginPath();
            intelligenceCtx.arc(x, y, 8, 0, Math.PI * 2);
            const gradient = intelligenceCtx.createRadialGradient(x, y, 0, x, y, 8);
            gradient.addColorStop(0, 'rgba(0, 255, 136, 0.6)');
            gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
            intelligenceCtx.fillStyle = gradient;
            intelligenceCtx.fill();
        }
    }
}

function initVirusIntelligenceAnimation() {
    intelligenceCanvas = document.getElementById('virus-intelligence-canvas');
    if (!intelligenceCanvas) return;
    
    intelligenceCtx = intelligenceCanvas.getContext('2d');
    
    // Set canvas size
    const container = intelligenceCanvas.parentElement;
    intelligenceCanvas.width = container.clientWidth;
    intelligenceCanvas.height = container.clientHeight;
    
    // Initialize animation
    initIntelligencePhase1();
    
    // Use IntersectionObserver to only animate when visible
    setupAnimationObserver(intelligenceCanvas, 'intelligence', () => animateIntelligence());
}

function initIntelligencePhase1() {
    intelligenceDnaStrands = [];
    
    for (let i = 0; i < 2; i++) {
        intelligenceDnaStrands.push(new DNAStrand(
            intelligenceCanvas.width / 2 + (i - 0.5) * 150,
            intelligenceCanvas.height / 2
        ));
    }
}

function animateIntelligence() {
    // Check if animation should run
    if (!animationStates.intelligence.running) {
        animationStates.intelligence.frameId = null;
        return;
    }
    
    // Clear canvas - transparent background
    intelligenceCtx.clearRect(0, 0, intelligenceCanvas.width, intelligenceCanvas.height);

    intelligenceDnaStrands.forEach(strand => {
        strand.update();
        strand.draw();
    });

    intelligenceConnections.forEach(conn => {
        conn.update();
        conn.draw();
    });

    intelligenceNeurons.forEach(neuron => {
        neuron.update();
        neuron.draw();
    });

    animationStates.intelligence.frameId = requestAnimationFrame(animateIntelligence);
}

// ==================== DNA TO BINARY ANIMATION ====================
let ngsCanvas, ngsCtx;
let sequences = [];
let speed = 1.0;
let numLines = 3;

class Sequence {
    constructor(y) {
        this.y = y;
        this.items = [];
        this.generateSequence();
    }

    generateSequence() {
        const dna = ['A', 'T', 'C', 'G'];
        const length = 8;
        const minDistance = 50;
        
        // Calculate sequence width and center it
        const sequenceWidth = (length - 1) * minDistance;
        const startX = (ngsCanvas.width - sequenceWidth) / 2;
        
        for (let i = 0; i < length; i++) {
            this.items.push({
                value: dna[Math.floor(Math.random() * 4)],
                x: startX + i * minDistance,
                y: this.y,
                targetX: null,
                isBinary: false,
                conversionPhase: 0 // 0: normal, 1: converting, 2: converted
            });
        }
    }

    update() {
        this.items.forEach((item, index) => {
            // Handle conversion phases
            if (item.conversionPhase === 1) {
                // Converting phase - add some visual effect
                item.alpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
            } else if (item.conversionPhase === 2) {
                // Converted phase - restore normal alpha
                item.alpha = 1;
                item.conversionPhase = 0;
            }
        });
    }

    randomConvert() {
        // Randomly convert some items between DNA and binary
        this.items.forEach(item => {
            if (Math.random() < 0.3) { // 30% chance to convert
                item.conversionPhase = 1; // Start converting
                
                setTimeout(() => {
                    if (item.isBinary) {
                        // Convert from binary to DNA
                        const dna = ['A', 'T', 'C', 'G'];
                        item.value = dna[Math.floor(Math.random() * 4)];
                        item.isBinary = false;
                    } else {
                        // Convert from DNA to binary
                        item.value = Math.random() > 0.5 ? '1' : '0';
                        item.isBinary = true;
                    }
                    item.conversionPhase = 2; // Mark as converted
                }, 200); // Short delay for visual effect
            }
        });
    }

    convertToBinary() {
        this.items.forEach(item => {
            if (!item.isBinary) {
                item.value = Math.random() > 0.5 ? '1' : '0';
                item.isBinary = true;
            }
        });
    }

    convertToDNA() {
        const dna = ['A', 'T', 'C', 'G'];
        this.items.forEach(item => {
            if (item.isBinary) {
                item.value = dna[Math.floor(Math.random() * 4)];
                item.isBinary = false;
            }
        });
    }

    draw() {
        ngsCtx.font = 'bold 28px Courier New';
        ngsCtx.textAlign = 'center';
        ngsCtx.textBaseline = 'middle';

        this.items.forEach(item => {
            ngsCtx.globalAlpha = item.alpha || 1;
            
            if (item.isBinary) {
                ngsCtx.fillStyle = item.value === '1' ? '#0f0' : '#0a0';
            } else {
                switch(item.value) {
                    case 'A': ngsCtx.fillStyle = '#00ff88'; break;
                    case 'T': ngsCtx.fillStyle = '#ff0088'; break;
                    case 'G': ngsCtx.fillStyle = '#00ffff'; break;
                    case 'C': ngsCtx.fillStyle = '#ffff00'; break;
                }
            }
            
            ngsCtx.fillText(item.value, item.x, this.y);
            ngsCtx.globalAlpha = 1;
        });
    }
}

function initNGSAnimation() {
    ngsCanvas = document.getElementById('ngs-canvas');
    if (!ngsCanvas) return;
    
    ngsCtx = ngsCanvas.getContext('2d');
    
    // Set canvas size
    const container = ngsCanvas.parentElement;
    ngsCanvas.width = container.clientWidth;
    ngsCanvas.height = container.clientHeight;
    
    // Initialize sequences
    sequences = [];
    const spacing = ngsCanvas.height / (numLines + 1);
    
    for (let i = 0; i < numLines; i++) {
        sequences.push(new Sequence(spacing * (i + 1)));
    }
    
    // Use IntersectionObserver to only animate when visible
    setupAnimationObserver(ngsCanvas, 'ngs', () => animateNGS());
}

function animateNGS() {
    // Check if animation should run
    if (!animationStates.ngs.running) {
        animationStates.ngs.frameId = null;
        return;
    }
    // Clear canvas - transparent background
    ngsCtx.clearRect(0, 0, ngsCanvas.width, ngsCanvas.height);

    sequences.forEach(seq => {
        seq.update();
        seq.draw();
    });

    animationStates.ngs.frameId = requestAnimationFrame(animateNGS);
}

// Actions
setInterval(() => {
    sequences.forEach(seq => seq.randomConvert());
}, 1500);

setInterval(() => {
    sequences.forEach(seq => {
        if (Math.random() > 0.5) {
            seq.convertToBinary();
        } else {
            seq.convertToDNA();
        }
    });
}, 3000);

// ==================== VIRUS SIMULATION ====================
let virusCanvas, virusCtx;
let viruses = [];
let virusSettings = {
    speed: 2,
    virusSize: 15,
    isPaused: false,
    maxViruses: 20,
    spawnInterval: 2000
};
let virusStats = {
    reproductionCount: 0,
    lastFrameTime: Date.now(),
    fps: 60
};
let lastVirusSpawnTime = Date.now();

class Virus {
    constructor(x, y, generation = 0) {
        this.x = x || Math.random() * virusCanvas.width;
        this.y = y || Math.random() * virusCanvas.height;
        this.vx = (Math.random() - 0.5) * virusSettings.speed;
        this.vy = (Math.random() - 0.5) * virusSettings.speed;
        this.radius = virusSettings.virusSize;
        this.generation = generation;
        
        // Color palette with diverse scientific colors
        const colorPalette = [
            180, // Cyan
            120, // Green
            300, // Magenta
            60,  // Yellow
            200, // Blue-Cyan
            340, // Pink
            160, // Blue-Green
            40,  // Orange-Yellow
            280, // Purple
            0,   // Red
            220, // Blue
            100  // Yellow-Green
        ];
        
        // Randomly select from palette or use random hue for more variety
        if (Math.random() < 0.7) {
            // 70% chance: use predefined palette
            this.hue = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        } else {
            // 30% chance: use completely random hue
            this.hue = Math.random() * 360;
        }
        
        // Slight hue variation for individuality
        this.hue += (Math.random() - 0.5) * 15;
        this.hue = this.hue % 360;
        
        this.spikes = 12 + Math.floor(Math.random() * 8);
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
        this.pulse = Math.random() * Math.PI * 2;
        this.age = 0;
        this.maxAge = 800 + Math.random() * 400;
    }

    update() {
        this.age++;
        
        // حرکت
        this.x += this.vx;
        this.y += this.vy;

        // برخورد با دیوار
        if (this.x - this.radius < 0 || this.x + this.radius > virusCanvas.width) {
            this.vx *= -1;
            this.x = Math.max(this.radius, Math.min(virusCanvas.width - this.radius, this.x));
        }
        if (this.y - this.radius < 0 || this.y + this.radius > virusCanvas.height) {
            this.vy *= -1;
            this.y = Math.max(this.radius, Math.min(virusCanvas.height - this.radius, this.y));
        }

        // چرخش
        this.rotation += this.rotationSpeed;
        this.pulse += 0.05;
    }

    draw() {
        const pulseEffect = Math.sin(this.pulse) * 0.2 + 1;
        const currentRadius = this.radius * pulseEffect;

        virusCtx.save();
        virusCtx.translate(this.x, this.y);
        virusCtx.rotate(this.rotation);

        // هسته مرکزی
        const gradient = virusCtx.createRadialGradient(0, 0, 0, 0, 0, currentRadius);
        gradient.addColorStop(0, `hsla(${this.hue}, 100%, 70%, 0.9)`);
        gradient.addColorStop(0.5, `hsla(${this.hue}, 100%, 50%, 0.7)`);
        gradient.addColorStop(1, `hsla(${this.hue}, 100%, 30%, 0.3)`);

        virusCtx.fillStyle = gradient;
        virusCtx.beginPath();
        virusCtx.arc(0, 0, currentRadius * 0.7, 0, Math.PI * 2);
        virusCtx.fill();

        // خارها
        for (let i = 0; i < this.spikes; i++) {
            const angle = (Math.PI * 2 / this.spikes) * i;
            const spikeLength = currentRadius * 0.8;
            
            virusCtx.beginPath();
            virusCtx.moveTo(0, 0);
            
            const x1 = Math.cos(angle) * currentRadius * 0.5;
            const y1 = Math.sin(angle) * currentRadius * 0.5;
            const x2 = Math.cos(angle) * (currentRadius * 0.5 + spikeLength);
            const y2 = Math.sin(angle) * (currentRadius * 0.5 + spikeLength);
            
            virusCtx.moveTo(x1, y1);
            virusCtx.lineTo(x2, y2);
            
            virusCtx.strokeStyle = `hsla(${this.hue}, 100%, 60%, 0.8)`;
            virusCtx.lineWidth = 2;
            virusCtx.lineCap = 'round';
            virusCtx.stroke();

            // دایره انتهای خار
            virusCtx.fillStyle = `hsla(${this.hue}, 100%, 70%, 0.9)`;
            virusCtx.beginPath();
            virusCtx.arc(x2, y2, 2, 0, Math.PI * 2);
            virusCtx.fill();
        }

        // حلقه درونی
        virusCtx.strokeStyle = `hsla(${this.hue}, 100%, 80%, 0.5)`;
        virusCtx.lineWidth = 2;
        virusCtx.beginPath();
        virusCtx.arc(0, 0, currentRadius * 0.4, 0, Math.PI * 2);
        virusCtx.stroke();

        virusCtx.restore();

        // هاله نور
        virusCtx.beginPath();
        virusCtx.arc(this.x, this.y, currentRadius * 1.5, 0, Math.PI * 2);
        const glowGradient = virusCtx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, currentRadius * 1.5
        );
        glowGradient.addColorStop(0, `hsla(${this.hue}, 100%, 50%, 0.2)`);
        glowGradient.addColorStop(1, `hsla(${this.hue}, 100%, 50%, 0)`);
        virusCtx.fillStyle = glowGradient;
        virusCtx.fill();
    }
}

function initVirusSimulation() {
    virusCanvas = document.getElementById('virus-canvas');
    if (!virusCanvas) return;
    
    virusCtx = virusCanvas.getContext('2d');
    
    // Set canvas size
    const container = virusCanvas.parentElement;
    virusCanvas.width = container.clientWidth;
    virusCanvas.height = container.clientHeight;
    
    // Start with some viruses
    resetViruses();
    
    // Use IntersectionObserver to only animate when visible
    setupAnimationObserver(virusCanvas, 'virus', () => animateViruses());
}

function resetViruses() {
    viruses = [];
    virusStats.reproductionCount = 0;
    lastVirusSpawnTime = Date.now();
    for (let i = 0; i < 5; i++) {
        viruses.push(new Virus());
    }
}

function animateViruses() {
    // Check if animation should run
    if (!animationStates.virus.running) {
        animationStates.virus.frameId = null;
        return;
    }
    
    // Clear canvas - transparent background
    virusCtx.clearRect(0, 0, virusCanvas.width, virusCanvas.height);

    // Random virus spawning at regular intervals
    const currentTime = Date.now();
    if (currentTime - lastVirusSpawnTime >= virusSettings.spawnInterval && 
        viruses.length < virusSettings.maxViruses) {
        viruses.push(new Virus());
        lastVirusSpawnTime = currentTime;
    }

    viruses.forEach(virus => {
        virus.update();
        virus.draw();
    });

    // Remove old viruses after specified duration
    viruses = viruses.filter(v => v.age < v.maxAge);

    animationStates.virus.frameId = requestAnimationFrame(animateViruses);
}

// ==================== IMMUNE ESCAPE ANIMATION ====================
let immuneEscapeCanvas, immuneEscapeCtx;
let immuneEscapeVirus = null;
let immuneEscapeAntibodies = [];
let immuneEscapeSugarCoating = null;
let immuneEscapeTime = 0;

class ImmuneEscapeVirus {
    constructor(centerX, centerY, canvasWidth, canvasHeight) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.x = centerX;
        this.y = centerY;
        this.radius = 18;
        this.angle = 0;
        this.orbitRadius = Math.min(canvasWidth, canvasHeight) * 0.15;
        this.orbitSpeed = 0.015;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.spikeRotation = 0;
    }

    update() {
        // Orbital movement pattern (like the sample)
        this.angle += this.orbitSpeed;
        this.x = this.centerX + Math.cos(this.angle) * this.orbitRadius;
        this.y = this.centerY + Math.sin(this.angle * 1.3) * (this.orbitRadius * 0.6);
        this.spikeRotation += 0.002;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw sugar coating glow (protective barrier)
        const coatingGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2.5);
        coatingGradient.addColorStop(0, 'rgba(255, 200, 100, 0.15)');
        coatingGradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.08)');
        coatingGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = coatingGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw virus with website colors (cyan/red theme)
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#ff6b6b';
        
        // Main virus body
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw rotating spikes
        const spikeCount = 12;
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        
        for (let i = 0; i < spikeCount; i++) {
            const angle = (i / spikeCount) * Math.PI * 2 + this.spikeRotation;
            const baseX = Math.cos(angle) * this.radius;
            const baseY = Math.sin(angle) * this.radius;
            const tipX = Math.cos(angle) * (this.radius + 8);
            const tipY = Math.sin(angle) * (this.radius + 8);
            
            ctx.beginPath();
            ctx.moveTo(baseX, baseY);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();
            
            // Spike tip
            ctx.fillStyle = '#ff8a95';
            ctx.beginPath();
            ctx.arc(tipX, tipY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Inner layers
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff8a95';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffa8b0';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class SugarCoating {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.baseRadius = radius;
    }

    update(virusX, virusY) {
        this.x = virusX;
        this.y = virusY;
    }

    isPointInside(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.baseRadius * 2.5;
    }
}

class Antibody {
    constructor(x, y) {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.radius = 8; // Smaller size
        this.speed = 2.0 + Math.random() * 0.5;
        this.approachAngle = 0;
        this.phaseOffset = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.02 + Math.random() * 0.01;
        this.wobbleRadius = 30 + Math.random() * 20;
        this.delayFactor = 0.85 + Math.random() * 0.15;
        this.minDistance = 80; // Minimum distance from virus (can't get closer)
    }

    update(virusX, virusY, sugarCoating, time, virusRadius = 18) {
        const dx = virusX - this.x;
        const dy = virusY - this.y;
        const distanceToVirus = Math.sqrt(dx * dx + dy * dy);
        
        // Wobble effect (like sample)
        const wobbleX = Math.cos(time * this.wobbleSpeed + this.phaseOffset) * this.wobbleRadius;
        const wobbleY = Math.sin(time * this.wobbleSpeed + this.phaseOffset) * this.wobbleRadius;
        
        const targetX = virusX + wobbleX;
        const targetY = virusY + wobbleY;
        
        const tdx = targetX - this.x;
        const tdy = targetY - this.y;
        const targetDistance = Math.sqrt(tdx * tdx + tdy * tdy);
        
        const effectiveSpeed = this.speed * this.delayFactor;
        
        if (targetDistance > 1) {
            // Calculate new position
            let newX = this.x + (tdx / targetDistance) * effectiveSpeed;
            let newY = this.y + (tdy / targetDistance) * effectiveSpeed;
            
            // Check if new position would be too close to virus
            const newDx = virusX - newX;
            const newDy = virusY - newY;
            const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);
            
            // Maintain minimum distance from virus
            if (newDistance < this.minDistance) {
                // Push away from virus to maintain safe distance
                const pushAngle = Math.atan2(newDy, newDx);
                newX = virusX - Math.cos(pushAngle) * this.minDistance;
                newY = virusY - Math.sin(pushAngle) * this.minDistance;
            }
            
            this.x = newX;
            this.y = newY;
        }
        
        // Check collision with sugar coating (additional protection)
        if (sugarCoating && sugarCoating.isPointInside(this.x, this.y)) {
            // Bounce away from coating
            const dx2 = this.x - sugarCoating.x;
            const dy2 = this.y - sugarCoating.y;
            const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            
            if (dist2 > 0) {
                const bounceForce = 3;
                this.x += (dx2 / dist2) * bounceForce;
                this.y += (dy2 / dist2) * bounceForce;
                
                // Ensure still maintaining minimum distance after bounce
                const finalDx = virusX - this.x;
                const finalDy = virusY - this.y;
                const finalDistance = Math.sqrt(finalDx * finalDx + finalDy * finalDy);
                
                if (finalDistance < this.minDistance) {
                    const pushAngle = Math.atan2(finalDy, finalDx);
                    this.x = virusX - Math.cos(pushAngle) * this.minDistance;
                    this.y = virusY - Math.sin(pushAngle) * this.minDistance;
                }
            }
        }
    }

    draw(ctx, virusX, virusY) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Calculate rotation to point at virus
        const dx = virusX - this.x;
        const dy = virusY - this.y;
        const rotation = Math.atan2(dy, dx) - Math.PI / 2;
        ctx.rotate(rotation);
        
        const scale = this.radius / 14; // Scale relative to original size (14)
        
        // Draw Y-shaped antibody with website colors (cyan/teal)
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ff88';
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 4 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Y shape
        ctx.beginPath();
        ctx.moveTo(0, 18 * scale);
        ctx.lineTo(0, -8 * scale);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, -8 * scale);
        ctx.lineTo(-10 * scale, -20 * scale);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, -8 * scale);
        ctx.lineTo(10 * scale, -20 * scale);
        ctx.stroke();
        
        // Tips
        ctx.fillStyle = '#00ffaa';
        ctx.beginPath();
        ctx.arc(-10 * scale, -20 * scale, 3.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(10 * scale, -20 * scale, 3.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Center
        ctx.fillStyle = '#00c963';
        ctx.beginPath();
        ctx.arc(0, 18 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

function initImmuneEscapeAnimation() {
    immuneEscapeCanvas = document.getElementById('immune-escape-canvas');
    if (!immuneEscapeCanvas) return;
    
    immuneEscapeCtx = immuneEscapeCanvas.getContext('2d');
    
    // Set canvas size
    const container = immuneEscapeCanvas.parentElement;
    immuneEscapeCanvas.width = container.clientWidth;
    immuneEscapeCanvas.height = container.clientHeight;
    
    // Initialize virus at center with orbital movement
    const centerX = immuneEscapeCanvas.width / 2;
    const centerY = immuneEscapeCanvas.height / 2;
    immuneEscapeVirus = new ImmuneEscapeVirus(centerX, centerY, immuneEscapeCanvas.width, immuneEscapeCanvas.height);
    immuneEscapeSugarCoating = new SugarCoating(centerX, centerY, 18);
    
    // Create antibodies around the edges (like sample)
    const numAntibodies = 8;
    for (let i = 0; i < numAntibodies; i++) {
        const angle = (i / numAntibodies) * Math.PI * 2;
        const startDistance = Math.min(immuneEscapeCanvas.width, immuneEscapeCanvas.height) * 0.25 + Math.random() * 50;
        const startX = centerX + Math.cos(angle) * startDistance;
        const startY = centerY + Math.sin(angle) * startDistance;
        immuneEscapeAntibodies.push(new Antibody(startX, startY));
    }
    
    // Use IntersectionObserver to only animate when visible
    setupAnimationObserver(immuneEscapeCanvas, 'immuneEscape', () => animateImmuneEscape());
}

function animateImmuneEscape() {
    // Check if animation should run
    if (!animationStates.immuneEscape || !animationStates.immuneEscape.running) {
        if (animationStates.immuneEscape) {
            animationStates.immuneEscape.frameId = null;
        }
        return;
    }
    
    // Clear canvas (transparent background for website)
    immuneEscapeCtx.clearRect(0, 0, immuneEscapeCanvas.width, immuneEscapeCanvas.height);
    
    immuneEscapeTime++;
    
    // Update virus (orbital movement)
    if (immuneEscapeVirus) {
        immuneEscapeVirus.update();
    }
    
    // Update sugar coating (follows virus)
    if (immuneEscapeSugarCoating && immuneEscapeVirus) {
        immuneEscapeSugarCoating.update(immuneEscapeVirus.x, immuneEscapeVirus.y);
    }
    
    // Update antibodies (chasing with wobble)
    if (immuneEscapeVirus) {
        immuneEscapeAntibodies.forEach(antibody => {
            antibody.update(immuneEscapeVirus.x, immuneEscapeVirus.y, immuneEscapeSugarCoating, immuneEscapeTime, immuneEscapeVirus.radius);
        });
    }
    
    // Draw connection lines (like sample)
    if (immuneEscapeVirus) {
        immuneEscapeCtx.strokeStyle = 'rgba(0, 255, 136, 0.08)';
        immuneEscapeCtx.lineWidth = 1;
        immuneEscapeAntibodies.forEach(antibody => {
            immuneEscapeCtx.beginPath();
            immuneEscapeCtx.moveTo(antibody.x, antibody.y);
            immuneEscapeCtx.lineTo(immuneEscapeVirus.x, immuneEscapeVirus.y);
            immuneEscapeCtx.stroke();
        });
    }
    
    // Draw antibodies first (behind virus)
    if (immuneEscapeVirus) {
        immuneEscapeAntibodies.forEach(antibody => {
            antibody.draw(immuneEscapeCtx, immuneEscapeVirus.x, immuneEscapeVirus.y);
        });
    }
    
    // Draw virus on top
    if (immuneEscapeVirus) {
        immuneEscapeVirus.draw(immuneEscapeCtx);
    }
    
    if (animationStates.immuneEscape) {
        animationStates.immuneEscape.frameId = requestAnimationFrame(animateImmuneEscape);
    }
}

// ==================== IMMUNE MEMORY REWRITE ANIMATION ====================
let immuneMemoryCanvas, immuneMemoryCtx;
let immuneMemoryViruses = [];
let immuneMemoryCells = [];
let immuneMemoryTime = 0;

class MemoryVirus {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 0.3 + Math.random() * 0.2;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.hasNewCoating = true;
        this.spikeRotation = 0;
        this.replicationTimer = 0;
        this.replicationInterval = 200 + Math.random() * 100;
    }

    update(canvasWidth, canvasHeight) {
        this.spikeRotation += 0.01;
        this.replicationTimer++;
        
        // Move
        this.x += this.vx;
        this.y += this.vy;
        
        // Bounce off walls
        if (this.x < this.radius || this.x > canvasWidth - this.radius) {
            this.vx *= -1;
            this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
        }
        if (this.y < this.radius || this.y > canvasHeight - this.radius) {
            this.vy *= -1;
            this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw sugar coating glow (protective barrier)
        const coatingGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2);
        coatingGradient.addColorStop(0, 'rgba(255, 200, 100, 0.2)');
        coatingGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = coatingGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw virus
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff6b6b';
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw spikes
        const spikeCount = 8;
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        for (let i = 0; i < spikeCount; i++) {
            const angle = (i / spikeCount) * Math.PI * 2 + this.spikeRotation;
            const baseX = Math.cos(angle) * this.radius;
            const baseY = Math.sin(angle) * this.radius;
            const tipX = Math.cos(angle) * (this.radius + 6);
            const tipY = Math.sin(angle) * (this.radius + 6);
            
            ctx.beginPath();
            ctx.moveTo(baseX, baseY);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();
        }
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

class MemoryCell {
    constructor(x, y, canvasWidth, canvasHeight) {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.targetVirus = null;
        this.recognitionAttempts = 0;
        this.maxAttempts = 3;
        this.state = 'idle'; // idle, recognizing, failed
        this.recognitionTimer = 0;
        this.pulse = 0;
        
        // Movement properties
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.orbitAngle = Math.random() * Math.PI * 2;
        this.orbitRadius = Math.min(canvasWidth, canvasHeight) * 0.15;
        this.orbitSpeed = 0.008 + Math.random() * 0.004;
        this.centerX = canvasWidth / 2;
        this.centerY = canvasHeight / 2;
        this.vx = 0;
        this.vy = 0;
        this.speed = 0.2 + Math.random() * 0.15;
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = 0;
    }

    update(viruses, time) {
        this.pulse += 0.05;
        this.wanderTimer++;
        
        // Find nearest virus
        let nearestVirus = null;
        let nearestDistance = Infinity;
        
        viruses.forEach(virus => {
            const dx = virus.x - this.x;
            const dy = virus.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < nearestDistance && distance < 150) {
                nearestDistance = distance;
                nearestVirus = virus;
            }
        });
        
        if (nearestVirus) {
            this.targetVirus = nearestVirus;
            
            // Move towards virus (but not too close)
            const dx = nearestVirus.x - this.x;
            const dy = nearestVirus.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 60) {
                // Move towards virus
                this.vx = (dx / distance) * this.speed * 0.5;
                this.vy = (dy / distance) * this.speed * 0.5;
            } else if (distance < 50) {
                // Move away if too close
                this.vx = (-dx / distance) * this.speed * 0.3;
                this.vy = (-dy / distance) * this.speed * 0.3;
            } else {
                // Orbit around virus
                const orbitAngle = Math.atan2(dy, dx) + Math.PI / 2;
                this.vx = Math.cos(orbitAngle) * this.speed * 0.4;
                this.vy = Math.sin(orbitAngle) * this.speed * 0.4;
            }
            
            // Try to recognize
            if (this.state === 'idle') {
                this.state = 'recognizing';
                this.recognitionTimer = 0;
            } else if (this.state === 'recognizing') {
                this.recognitionTimer++;
                
                // Recognition fails because of new coating
                if (this.recognitionTimer > 60) {
                    this.state = 'failed';
                    this.recognitionAttempts++;
                    this.recognitionTimer = 0;
                }
            } else if (this.state === 'failed') {
                this.recognitionTimer++;
                if (this.recognitionTimer > 40) {
                    if (this.recognitionAttempts < this.maxAttempts) {
                        this.state = 'recognizing';
                        this.recognitionTimer = 0;
                    } else {
                        this.state = 'idle';
                        this.recognitionAttempts = 0;
                        this.recognitionTimer = 0;
                    }
                }
            }
        } else {
            this.targetVirus = null;
            this.state = 'idle';
            this.recognitionTimer = 0;
            
            // Wander/orbit when no virus nearby
            if (this.wanderTimer % 120 === 0) {
                this.wanderAngle = Math.random() * Math.PI * 2;
            }
            
            // Orbital movement around center
            this.orbitAngle += this.orbitSpeed;
            const targetX = this.centerX + Math.cos(this.orbitAngle) * this.orbitRadius;
            const targetY = this.centerY + Math.sin(this.orbitAngle * 1.2) * (this.orbitRadius * 0.7);
            
            const tdx = targetX - this.x;
            const tdy = targetY - this.y;
            const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
            
            if (tdist > 1) {
                this.vx = (tdx / tdist) * this.speed * 0.3;
                this.vy = (tdy / tdist) * this.speed * 0.3;
            }
        }
        
        // Apply movement
        this.x += this.vx;
        this.y += this.vy;
        
        // Apply friction
        this.vx *= 0.95;
        this.vy *= 0.95;
        
        // Keep within bounds
        const margin = this.radius;
        if (this.x < margin) {
            this.x = margin;
            this.vx *= -0.5;
        }
        if (this.x > this.canvasWidth - margin) {
            this.x = this.canvasWidth - margin;
            this.vx *= -0.5;
        }
        if (this.y < margin) {
            this.y = margin;
            this.vy *= -0.5;
        }
        if (this.y > this.canvasHeight - margin) {
            this.y = this.canvasHeight - margin;
            this.vy *= -0.5;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const pulseRadius = this.radius + Math.sin(this.pulse) * 2;
        
        // Draw based on state
        if (this.state === 'recognizing') {
            // Blue - trying to recognize
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00aaff';
            ctx.fillStyle = '#00aaff';
            ctx.strokeStyle = '#00aaff';
        } else if (this.state === 'failed') {
            // Red - failed recognition
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff4444';
            ctx.fillStyle = '#ff4444';
            ctx.strokeStyle = '#ff4444';
        } else {
            // Gray - idle
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#666';
            ctx.fillStyle = '#666';
            ctx.strokeStyle = '#666';
        }
        
        // Draw cell body
        ctx.beginPath();
        ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw recognition attempt lines
        if (this.targetVirus && (this.state === 'recognizing' || this.state === 'failed')) {
            ctx.save();
            ctx.globalAlpha = this.state === 'recognizing' ? 0.4 : 0.2;
            ctx.strokeStyle = this.state === 'recognizing' ? '#00aaff' : '#ff4444';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(this.targetVirus.x - this.x, this.targetVirus.y - this.y);
            ctx.stroke();
            ctx.restore();
        }
        
        // Draw inner core
        ctx.fillStyle = this.state === 'recognizing' ? '#00ccff' : 
                       this.state === 'failed' ? '#ff6666' : '#888';
        ctx.beginPath();
        ctx.arc(0, 0, pulseRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

function initImmuneMemoryAnimation() {
    immuneMemoryCanvas = document.getElementById('immune-memory-canvas');
    if (!immuneMemoryCanvas) return;
    
    immuneMemoryCtx = immuneMemoryCanvas.getContext('2d');
    
    // Set canvas size
    const container = immuneMemoryCanvas.parentElement;
    immuneMemoryCanvas.width = container.clientWidth;
    immuneMemoryCanvas.height = container.clientHeight;
    
    // Create memory cells (immune cells that should recognize the virus)
    const numCells = 4;
    for (let i = 0; i < numCells; i++) {
        const angle = (i / numCells) * Math.PI * 2;
        const distance = Math.min(immuneMemoryCanvas.width, immuneMemoryCanvas.height) * 0.25;
        const x = immuneMemoryCanvas.width / 2 + Math.cos(angle) * distance;
        const y = immuneMemoryCanvas.height / 2 + Math.sin(angle) * distance;
        immuneMemoryCells.push(new MemoryCell(x, y, immuneMemoryCanvas.width, immuneMemoryCanvas.height));
    }
    
    // Start with one virus
    const centerX = immuneMemoryCanvas.width / 2;
    const centerY = immuneMemoryCanvas.height / 2;
    immuneMemoryViruses.push(new MemoryVirus(centerX + (Math.random() - 0.5) * 50, centerY + (Math.random() - 0.5) * 50));
    
    // Use IntersectionObserver to only animate when visible
    setupAnimationObserver(immuneMemoryCanvas, 'immuneMemory', () => animateImmuneMemory());
}

function animateImmuneMemory() {
    // Check if animation should run
    if (!animationStates.immuneMemory || !animationStates.immuneMemory.running) {
        if (animationStates.immuneMemory) {
            animationStates.immuneMemory.frameId = null;
        }
        return;
    }
    
    // Clear canvas
    immuneMemoryCtx.clearRect(0, 0, immuneMemoryCanvas.width, immuneMemoryCanvas.height);
    
    immuneMemoryTime++;
    
    // Update memory cells
    immuneMemoryCells.forEach(cell => {
        cell.update(immuneMemoryViruses, immuneMemoryTime);
    });
    
    // Update viruses
    immuneMemoryViruses.forEach(virus => {
        virus.update(immuneMemoryCanvas.width, immuneMemoryCanvas.height);
        
        // Replication (viruses multiply because immune cells can't stop them)
        if (virus.replicationTimer >= virus.replicationInterval && immuneMemoryViruses.length < 8) {
            const angle = Math.random() * Math.PI * 2;
            const distance = virus.radius * 3;
            const newX = virus.x + Math.cos(angle) * distance;
            const newY = virus.y + Math.sin(angle) * distance;
            
            if (newX > virus.radius && newX < immuneMemoryCanvas.width - virus.radius &&
                newY > virus.radius && newY < immuneMemoryCanvas.height - virus.radius) {
                immuneMemoryViruses.push(new MemoryVirus(newX, newY));
                virus.replicationTimer = 0;
            }
        }
    });
    
    // Draw memory cells
    immuneMemoryCells.forEach(cell => {
        cell.draw(immuneMemoryCtx);
    });
    
    // Draw viruses
    immuneMemoryViruses.forEach(virus => {
        virus.draw(immuneMemoryCtx);
    });
    
    if (animationStates.immuneMemory) {
        animationStates.immuneMemory.frameId = requestAnimationFrame(animateImmuneMemory);
    }
}

// ==================== AI VACCINE DESIGN ANIMATION ====================
let aiVaccineCanvas, aiVaccineCtx;
let aiVaccineTime = 0;

// Position constants
let virusX, virusY, aiX, aiY, vaccineX, vaccineY;

// Animation elements
let virusParticles = [];
let aiParticles = [];
let dataFlows = [];
let neuralConnections = [];
let vaccineCompletion = 0;

function resizeAIVaccineCanvas() {
    if (!aiVaccineCanvas) return;
    
    const container = aiVaccineCanvas.parentElement;
    aiVaccineCanvas.width = container.clientWidth;
    aiVaccineCanvas.height = container.clientHeight;
    
    // Recalculate positions
    virusX = aiVaccineCanvas.width * 0.2;
    virusY = aiVaccineCanvas.height / 2;
    aiX = aiVaccineCanvas.width / 2;
    aiY = aiVaccineCanvas.height / 2;
    vaccineX = aiVaccineCanvas.width * 0.8;
    vaccineY = aiVaccineCanvas.height / 2;
    
    // Update particle positions
    virusParticles.forEach(particle => {
        particle.x = virusX;
        particle.y = virusY;
    });
}

function initAIVaccineAnimation() {
    aiVaccineCanvas = document.getElementById('ai-vaccine-canvas');
    if (!aiVaccineCanvas) return;
    
    aiVaccineCtx = aiVaccineCanvas.getContext('2d');
    
    // Set canvas size
    const container = aiVaccineCanvas.parentElement;
    aiVaccineCanvas.width = container.clientWidth;
    aiVaccineCanvas.height = container.clientHeight;
    
    // Calculate positions
    virusX = aiVaccineCanvas.width * 0.2;
    virusY = aiVaccineCanvas.height / 2;
    aiX = aiVaccineCanvas.width / 2;
    aiY = aiVaccineCanvas.height / 2;
    vaccineX = aiVaccineCanvas.width * 0.8;
    vaccineY = aiVaccineCanvas.height / 2;
    
    // Initialize virus particles
    virusParticles = [];
    for (let i = 0; i < 30; i++) {
        virusParticles.push({
            x: virusX,
            y: virusY,
            angle: Math.random() * Math.PI * 2,
            distance: 40 + Math.random() * 30,
            speed: 0.01 + Math.random() * 0.02,
            size: 2 + Math.random() * 2
        });
    }
    
    // Initialize AI particles
    aiParticles = [];
    for (let i = 0; i < 60; i++) {
        aiParticles.push({
            angle: Math.random() * Math.PI * 2,
            distance: 50 + Math.random() * 80,
            speed: 0.01 + Math.random() * 0.02,
            size: 2 + Math.random() * 3,
            brightness: Math.random()
        });
    }
    
    // Initialize neural connections
    neuralConnections = [];
    for (let i = 0; i < 15; i++) {
        for (let j = i + 1; j < 15; j++) {
            if (Math.random() < 0.3) {
                neuralConnections.push({ from: i, to: j });
            }
        }
    }
    
    // Reset data flows and vaccine completion
    dataFlows = [];
    vaccineCompletion = 0;
    aiVaccineTime = 0;
    
    // Add resize handler
    window.addEventListener('resize', resizeAIVaccineCanvas);
    
    // Use IntersectionObserver to only animate when visible
    setupAnimationObserver(aiVaccineCanvas, 'aiVaccine', () => animateAIVaccine());
}

function createDataFlow() {
    if (Math.random() < 0.08) {
        dataFlows.push({
            x: virusX,
            y: virusY,
            targetX: aiX,
            targetY: aiY,
            progress: 0,
            speed: 0.015 + Math.random() * 0.01,
            size: 2 + Math.random() * 2,
            toVaccine: false
        });
    }

    if (Math.random() < 0.12) {
        dataFlows.push({
            x: aiX,
            y: aiY,
            targetX: vaccineX,
            targetY: vaccineY,
            progress: 0,
            speed: 0.025 + Math.random() * 0.015,
            size: 2 + Math.random() * 2,
            toVaccine: true
        });
    }
}

function drawVirus() {
    const pulse = 1 + Math.sin(aiVaccineTime * 0.05) * 0.1;
    const radius = 50 * pulse;

    aiVaccineCtx.save();
    aiVaccineCtx.shadowBlur = 30;
    aiVaccineCtx.shadowColor = '#ff1744';
    
    const gradient = aiVaccineCtx.createRadialGradient(virusX, virusY, 0, virusX, virusY, radius);
    gradient.addColorStop(0, '#ff4569');
    gradient.addColorStop(0.7, '#ff1744');
    gradient.addColorStop(1, '#cc0033');
    
    aiVaccineCtx.fillStyle = gradient;
    aiVaccineCtx.beginPath();
    aiVaccineCtx.arc(virusX, virusY, radius, 0, Math.PI * 2);
    aiVaccineCtx.fill();

    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + aiVaccineTime * 0.02;
        const spikeLength = 15 + Math.sin(aiVaccineTime * 0.1 + i) * 3;
        
        aiVaccineCtx.strokeStyle = '#ff1744';
        aiVaccineCtx.lineWidth = 3;
        aiVaccineCtx.beginPath();
        aiVaccineCtx.moveTo(virusX + Math.cos(angle) * radius, virusY + Math.sin(angle) * radius);
        aiVaccineCtx.lineTo(virusX + Math.cos(angle) * (radius + spikeLength), virusY + Math.sin(angle) * (radius + spikeLength));
        aiVaccineCtx.stroke();
        
        aiVaccineCtx.fillStyle = '#ff4569';
        aiVaccineCtx.beginPath();
        aiVaccineCtx.arc(virusX + Math.cos(angle) * (radius + spikeLength), virusY + Math.sin(angle) * (radius + spikeLength), 3, 0, Math.PI * 2);
        aiVaccineCtx.fill();
    }

    virusParticles.forEach(particle => {
        particle.angle += particle.speed;
        const x = virusX + Math.cos(particle.angle) * particle.distance;
        const y = virusY + Math.sin(particle.angle) * particle.distance;
        
        aiVaccineCtx.fillStyle = 'rgba(255, 69, 105, 0.6)';
        aiVaccineCtx.beginPath();
        aiVaccineCtx.arc(x, y, particle.size, 0, Math.PI * 2);
        aiVaccineCtx.fill();
    });

    aiVaccineCtx.shadowBlur = 0;
    aiVaccineCtx.restore();
}

function drawAICore() {
    const pulseSize = 70 + Math.sin(aiVaccineTime * 0.05) * 15;

    aiVaccineCtx.shadowBlur = 40;
    aiVaccineCtx.shadowColor = '#00d4ff';
    
    const gradient = aiVaccineCtx.createRadialGradient(aiX, aiY, 0, aiX, aiY, pulseSize);
    gradient.addColorStop(0, 'rgba(123, 47, 255, 0.9)');
    gradient.addColorStop(0.4, 'rgba(0, 212, 255, 0.7)');
    gradient.addColorStop(0.7, 'rgba(0, 212, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
    
    aiVaccineCtx.fillStyle = gradient;
    aiVaccineCtx.beginPath();
    aiVaccineCtx.arc(aiX, aiY, pulseSize, 0, Math.PI * 2);
    aiVaccineCtx.fill();

    aiParticles.forEach(particle => {
        particle.angle += particle.speed;
        particle.brightness = 0.5 + Math.sin(aiVaccineTime * 0.1 + particle.angle * 3) * 0.5;
        
        const x = aiX + Math.cos(particle.angle) * particle.distance;
        const y = aiY + Math.sin(particle.angle) * particle.distance;
        
        aiVaccineCtx.fillStyle = `rgba(0, 212, 255, ${particle.brightness})`;
        aiVaccineCtx.beginPath();
        aiVaccineCtx.arc(x, y, particle.size, 0, Math.PI * 2);
        aiVaccineCtx.fill();
    });

    neuralConnections.forEach(conn => {
        const p1 = aiParticles[conn.from];
        const p2 = aiParticles[conn.to];
        
        if (!p1 || !p2) return;
        
        const x1 = aiX + Math.cos(p1.angle) * p1.distance;
        const y1 = aiY + Math.sin(p1.angle) * p1.distance;
        const x2 = aiX + Math.cos(p2.angle) * p2.distance;
        const y2 = aiY + Math.sin(p2.angle) * p2.distance;
        
        aiVaccineCtx.strokeStyle = `rgba(0, 212, 255, ${(p1.brightness + p2.brightness) * 0.15})`;
        aiVaccineCtx.lineWidth = 1;
        aiVaccineCtx.beginPath();
        aiVaccineCtx.moveTo(x1, y1);
        aiVaccineCtx.lineTo(x2, y2);
        aiVaccineCtx.stroke();
    });

    aiVaccineCtx.shadowBlur = 0;

    aiVaccineCtx.fillStyle = '#00d4ff';
    aiVaccineCtx.font = 'bold 32px Arial';
    aiVaccineCtx.textAlign = 'center';
    aiVaccineCtx.textBaseline = 'middle';
    aiVaccineCtx.fillText('AI', aiX, aiY);
}

function drawVaccine() {
    vaccineCompletion += 0.003;
    if (vaccineCompletion > 1) vaccineCompletion = 1;

    const baseRadius = 45;
    const glowSize = baseRadius + 20;

    aiVaccineCtx.save();
    aiVaccineCtx.shadowBlur = 30;
    aiVaccineCtx.shadowColor = '#00ff88';

    const gradient = aiVaccineCtx.createRadialGradient(vaccineX, vaccineY, 0, vaccineX, vaccineY, glowSize);
    gradient.addColorStop(0, `rgba(0, 255, 136, ${vaccineCompletion * 0.4})`);
    gradient.addColorStop(0.7, `rgba(0, 255, 136, ${vaccineCompletion * 0.2})`);
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
    
    aiVaccineCtx.fillStyle = gradient;
    aiVaccineCtx.beginPath();
    aiVaccineCtx.arc(vaccineX, vaccineY, glowSize, 0, Math.PI * 2);
    aiVaccineCtx.fill();

    const bodyWidth = 30;
    const bodyHeight = 70;
    const needleHeight = 35;
    const needleWidth = 8;
    const plungerHeight = 15;

    aiVaccineCtx.fillStyle = `rgba(0, 255, 136, ${vaccineCompletion * 0.9})`;
    aiVaccineCtx.strokeStyle = `rgba(0, 200, 110, ${vaccineCompletion})`;
    aiVaccineCtx.lineWidth = 2;

    aiVaccineCtx.beginPath();
    aiVaccineCtx.rect(vaccineX - bodyWidth / 2, vaccineY - bodyHeight / 2, bodyWidth, bodyHeight);
    aiVaccineCtx.fill();
    aiVaccineCtx.stroke();

    aiVaccineCtx.fillStyle = `rgba(0, 255, 136, ${vaccineCompletion * 0.3})`;
    aiVaccineCtx.beginPath();
    aiVaccineCtx.rect(vaccineX - bodyWidth / 2 + 2, vaccineY - bodyHeight / 2 + 2, bodyWidth - 4, bodyHeight * vaccineCompletion - 4);
    aiVaccineCtx.fill();

    const fingerGripWidth = bodyWidth + 10;
    const fingerGripHeight = 8;
    aiVaccineCtx.fillStyle = `rgba(0, 255, 136, ${vaccineCompletion * 0.9})`;
    aiVaccineCtx.beginPath();
    aiVaccineCtx.rect(vaccineX - fingerGripWidth / 2, vaccineY + bodyHeight / 2 - fingerGripHeight / 2, fingerGripWidth, fingerGripHeight);
    aiVaccineCtx.fill();
    aiVaccineCtx.stroke();

    aiVaccineCtx.fillStyle = `rgba(0, 200, 110, ${vaccineCompletion})`;
    aiVaccineCtx.beginPath();
    aiVaccineCtx.rect(vaccineX - bodyWidth / 4, vaccineY - bodyHeight / 2 - plungerHeight, bodyWidth / 2, plungerHeight);
    aiVaccineCtx.fill();
    aiVaccineCtx.stroke();

    const plungerTopWidth = bodyWidth / 2 + 8;
    const plungerTopHeight = 6;
    aiVaccineCtx.beginPath();
    aiVaccineCtx.rect(vaccineX - plungerTopWidth / 2, vaccineY - bodyHeight / 2 - plungerHeight - plungerTopHeight, plungerTopWidth, plungerTopHeight);
    aiVaccineCtx.fill();
    aiVaccineCtx.stroke();

    aiVaccineCtx.fillStyle = `rgba(180, 220, 200, ${vaccineCompletion})`;
    const needleGradient = aiVaccineCtx.createLinearGradient(vaccineX, vaccineY + bodyHeight / 2, vaccineX, vaccineY + bodyHeight / 2 + needleHeight);
    needleGradient.addColorStop(0, `rgba(180, 220, 200, ${vaccineCompletion})`);
    needleGradient.addColorStop(1, `rgba(120, 160, 140, ${vaccineCompletion * 0.7})`);
    aiVaccineCtx.fillStyle = needleGradient;
    
    aiVaccineCtx.beginPath();
    aiVaccineCtx.moveTo(vaccineX - needleWidth / 2, vaccineY + bodyHeight / 2);
    aiVaccineCtx.lineTo(vaccineX, vaccineY + bodyHeight / 2 + needleHeight);
    aiVaccineCtx.lineTo(vaccineX + needleWidth / 2, vaccineY + bodyHeight / 2);
    aiVaccineCtx.closePath();
    aiVaccineCtx.fill();
    aiVaccineCtx.stroke();

    for (let i = 0; i < 3; i++) {
        aiVaccineCtx.strokeStyle = `rgba(0, 255, 136, ${vaccineCompletion * 0.3})`;
        aiVaccineCtx.lineWidth = 1;
        const markY = vaccineY - bodyHeight / 2 + 15 + i * 15;
        aiVaccineCtx.beginPath();
        aiVaccineCtx.moveTo(vaccineX - bodyWidth / 2 - 3, markY);
        aiVaccineCtx.lineTo(vaccineX - bodyWidth / 2, markY);
        aiVaccineCtx.stroke();
    }

    if (vaccineCompletion > 0.3) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + aiVaccineTime * 0.03;
            const dist = 55 + Math.sin(aiVaccineTime * 0.05 + i) * 5;
            const px = vaccineX + Math.cos(angle) * dist;
            const py = vaccineY + Math.sin(angle) * dist;
            
            aiVaccineCtx.fillStyle = `rgba(0, 255, 136, ${vaccineCompletion * 0.5})`;
            aiVaccineCtx.beginPath();
            aiVaccineCtx.arc(px, py, 2, 0, Math.PI * 2);
            aiVaccineCtx.fill();
        }
    }

    aiVaccineCtx.shadowBlur = 0;
    aiVaccineCtx.restore();
}

function drawDataFlows() {
    dataFlows.forEach((flow, index) => {
        flow.progress += flow.speed;
        
        if (flow.progress >= 1) {
            dataFlows.splice(index, 1);
            return;
        }

        const currentX = flow.x + (flow.targetX - flow.x) * flow.progress;
        const currentY = flow.y + (flow.targetY - flow.y) * flow.progress;

        const color = flow.toVaccine ? '0, 255, 136' : '255, 69, 105';
        
        aiVaccineCtx.shadowBlur = 10;
        aiVaccineCtx.shadowColor = flow.toVaccine ? '#00ff88' : '#ff4569';
        aiVaccineCtx.fillStyle = `rgba(${color}, ${1 - flow.progress * 0.3})`;
        aiVaccineCtx.beginPath();
        aiVaccineCtx.arc(currentX, currentY, flow.size, 0, Math.PI * 2);
        aiVaccineCtx.fill();
        
        aiVaccineCtx.shadowBlur = 0;
    });
}

function animateAIVaccine() {
    // Check if animation should run
    if (!animationStates.aiVaccine || !animationStates.aiVaccine.running) {
        if (animationStates.aiVaccine) {
            animationStates.aiVaccine.frameId = null;
        }
        return;
    }
    
    aiVaccineTime++;
    createDataFlow();
    
    // Clear canvas (transparent background)
    aiVaccineCtx.clearRect(0, 0, aiVaccineCanvas.width, aiVaccineCanvas.height);

    // Draw connection lines
    aiVaccineCtx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
    aiVaccineCtx.lineWidth = 2;
    aiVaccineCtx.setLineDash([10, 10]);
    aiVaccineCtx.beginPath();
    aiVaccineCtx.moveTo(virusX, virusY);
    aiVaccineCtx.lineTo(aiX, aiY);
    aiVaccineCtx.lineTo(vaccineX, vaccineY);
    aiVaccineCtx.stroke();
    aiVaccineCtx.setLineDash([]);

    drawDataFlows();
    drawVirus();
    drawAICore();
    drawVaccine();
    
    if (animationStates.aiVaccine) {
        animationStates.aiVaccine.frameId = requestAnimationFrame(animateAIVaccine);
    }
}

// ==================== AI MUTATION PREDICTOR ====================
let originalSequence = '';
let currentSequence = '';
let sequenceLength = 0;
let isAnalyzing = false;
let currentWizardStep = 1;
let selectedMutationType = '';
let mutationData = {};
let sequenceHistory = []; // For undo functionality

// RNA nucleotide bases
const RNA_BASES = ['A', 'U', 'G', 'C'];

// AI thinking logs database
// Gemini API Configuration
// API key is loaded from config.js (which is gitignored)
// If config.js is missing, check the console for instructions

// Try to get API key from window object (set by config.js)
// If config.js loaded before this script, window.GEMINI_API_KEY will be available
// Note: We don't redeclare GEMINI_API_KEY here to avoid "already declared" error
// Instead, we use a function to get it from window object
function getGeminiApiKey() {
    try {
        if (typeof window !== 'undefined' && window.GEMINI_API_KEY) {
            return window.GEMINI_API_KEY;
        }
    } catch (e) {
        console.error('❌ Error accessing window.GEMINI_API_KEY:', e);
    }
    return null;
}

// Get API key - use window object directly to avoid redeclaration error
// We'll access it via window.GEMINI_API_KEY or use the function when needed
const apiKey = getGeminiApiKey();

// Log status
if (apiKey && apiKey !== 'YOUR_API_KEY_HERE') {
    console.log('✅ API key loaded from config.js');
} else if (typeof window !== 'undefined' && window.CONFIG_LOADED) {
    console.warn('⚠️ API key not found or not configured in config.js');
} else {
    console.error('❌ config.js may not have loaded. Check browser console for errors.');
}

// Validate API key - use function to get it
const currentApiKey = getGeminiApiKey();
if (!currentApiKey || currentApiKey === 'YOUR_API_KEY_HERE') {
    console.error('❌ GEMINI_API_KEY is not configured!');
    console.error('📝 Please create a config.js file based on config.example.js');
    console.error('🔑 Get your API key from: https://aistudio.google.com/app/apikey');
    console.error('⚠️  The application will not work without a valid API key.');
    
    // Show user-friendly error message (only after DOM is ready)
    if (typeof document !== 'undefined') {
        const showError = () => {
            if (document.body) {
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = `
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(255, 0, 0, 0.9);
                    color: white;
                    padding: 20px 30px;
                    border-radius: 10px;
                    z-index: 10000;
                    font-family: 'Vazirmatn', sans-serif;
                    text-align: center;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                    max-width: 500px;
                `;
                errorDiv.innerHTML = `
                    <h3 style="margin: 0 0 10px 0;">⚠️ API Key Missing</h3>
                    <p style="margin: 0 0 10px 0;">Please create a <code>config.js</code> file with your Gemini API key.</p>
                    <p style="margin: 0; font-size: 0.9em;">Copy <code>config.example.js</code> to <code>config.js</code> and add your key.</p>
                `;
                document.body.appendChild(errorDiv);
                
                // Auto-remove after 10 seconds
                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        errorDiv.parentNode.removeChild(errorDiv);
                    }
                }, 10000);
            } else {
                // Wait for DOM to be ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', showError);
                } else {
                    setTimeout(showError, 100);
                }
            }
        };
        showError();
    }
}

// Use gemini-2.5-flash which is available and fast
const GEMINI_MODEL = 'gemini-2.5-flash';

// Create API URLs dynamically to use the API key from config
function getGeminiApiUrl() {
    const apiKey = getGeminiApiKey();
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE' || (typeof apiKey === 'string' && apiKey.trim() === '')) {
        const errorMsg = 'GEMINI_API_KEY is not configured. Please create config.js file with your API key.';
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
    return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
}

function getGeminiListModelsUrl() {
    const apiKey = getGeminiApiKey();
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE' || (typeof apiKey === 'string' && apiKey.trim() === '')) {
        const errorMsg = 'GEMINI_API_KEY is not configured. Please create config.js file with your API key.';
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
    return `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
}

// Function to list available models
async function listAvailableModels() {
    try {
        const response = await fetch(getGeminiListModelsUrl());
        const data = await response.json();
        console.log('Available Models:', data);
        if (data.models) {
            const modelNames = data.models.map(m => m.name).filter(n => n);
            console.log('Model Names:', modelNames);
            return modelNames;
        }
        return [];
    } catch (error) {
        console.error('Error listing models:', error);
        return [];
    }
}

// Test Gemini API connection
async function testGeminiAPI() {
    try {
        console.log('Testing Gemini API...');
        const apiKey = getGeminiApiKey();
        if (apiKey) {
            console.log('API Key:', apiKey.substring(0, 10) + '...');
        }
        console.log('Model:', GEMINI_MODEL);
        try {
            console.log('URL:', getGeminiApiUrl().substring(0, 80) + '...');
        } catch (e) {
            console.log('URL: [API key not configured]');
        }
        
        // First, try to list available models
        console.log('Checking available models...');
        const availableModels = await listAvailableModels();
        if (availableModels.length > 0) {
            console.log('✅ Available models:', availableModels);
        }
        
        const testPrompt = 'Say "Hello, API is working" in one sentence.';
        
        const response = await fetch(getGeminiApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: testPrompt
                    }]
                }]
            })
        });

        console.log('Response Status:', response.status);
        console.log('Response OK:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error Response:', errorText);
            
            let errorMessage = `API Error: ${response.status}`;
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error && errorData.error.message) {
                    errorMessage = errorData.error.message;
                }
            } catch (e) {
                errorMessage += ` - ${errorText.substring(0, 200)}`;
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('API Response:', data);
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const result = data.candidates[0].content.parts[0].text;
            console.log('✅ API Test Successful!');
            console.log('Response:', result);
            return { success: true, message: result };
        } else {
            console.error('❌ Unexpected response structure:', data);
            return { success: false, error: 'Unexpected response structure' };
        }
    } catch (error) {
        console.error('❌ API Test Failed:', error);
        return { success: false, error: error.message };
    }
}


// Generate complete analysis with logs and analysis using Gemini API
async function generateFullAIAnalysis(mutationInfo) {
    try {
        // Generate random seed for variation
        const randomSeed = Date.now() + Math.random();
        
        const prompt = `You are an advanced AI virologist and molecular biologist analyzing viral mutations for a DEMONSTRATION PURPOSE. 
IMPORTANT: Generate REALISTIC-LOOKING but RANDOM/FICTIONAL data. This is for display/demonstration only, not real research data.

MUTATION INFORMATION (EXACT DETAILS - USE THESE FOR ANALYSIS):
- Mutation Type: ${mutationInfo.type}

FOR ${mutationInfo.type.toUpperCase()} MUTATION:
${mutationInfo.type === 'deletion' ? 
`- Deleted nucleotides: "${mutationInfo.deleted}" (${mutationInfo.length} nucleotides)
- Position range: ${mutationInfo.position} to ${mutationInfo.endPosition}
- Original sequence at affected region: "${mutationInfo.deleted}"` :
mutationInfo.type === 'insertion' ?
`- Inserted nucleotides: "${mutationInfo.inserted}" (${mutationInfo.length} nucleotides)
- Insertion position: ${mutationInfo.position} (inserted AFTER this position)` :
mutationInfo.type === 'inversion' ?
`- Original sequence: "${mutationInfo.original}"
- Inverted sequence: "${mutationInfo.inverted}"
- Position range: ${mutationInfo.position} to ${mutationInfo.endPosition}` :
mutationInfo.type === 'substitution' ?
`- Original nucleotides: "${mutationInfo.original}" (${mutationInfo.length} nucleotides)
- Substituted nucleotides: "${mutationInfo.mutated}" (${mutationInfo.length} nucleotides)
- Position range: ${mutationInfo.position} to ${mutationInfo.endPosition}` : ''}

COMPLETE SEQUENCES:
- Original sequence (BEFORE mutation): ${mutationInfo.originalSequence || 'Not provided'}
- Mutated sequence (AFTER mutation): ${mutationInfo.mutatedSequence || 'Not provided'}
- Sequence length change: ${mutationInfo.mutatedSequence ? mutationInfo.mutatedSequence.length - mutationInfo.originalSequence.length : 0} nucleotides

AFFECTED REGION: Positions ${mutationInfo.affectedRegion || 'Unknown'}

Random Seed: ${randomSeed}

IMPORTANT: In your analysis, SPECIFICALLY mention:
1. The POSITION RANGE where mutation occurred (e.g., "در موقعیت ${mutationInfo.position} تا ${mutationInfo.endPosition || mutationInfo.position}")
2. DO NOT write the full nucleotide sequence in the analysis text - only mention position ranges
3. For example, say "حذف ${mutationInfo.length} نوکلئوتید از موقعیت ${mutationInfo.position} تا ${mutationInfo.endPosition}" instead of writing the actual sequence
4. When describing changes, use position references, not sequence text (e.g., "نوکلئوتیدهای موجود در محدوده ${mutationInfo.position}-${mutationInfo.endPosition || mutationInfo.position}")

TASK: Generate a complete analysis with two distinct sections:

SECTION 1 - LOGS (10-14 log messages):
Start with "===LOGS_START==="
Generate 10-14 short, technical log messages in English showing step-by-step 3D structure analysis.
Each message should be one line, max 60 characters, professional and technical.
Examples: "Loading 3D protein structure...", "Analyzing conformational changes...", "Mapping enzyme active sites...", "Calculating binding pocket alterations...", "Simulating protein folding dynamics..."
Focus on 3D structure analysis, protein folding, conformational changes, and molecular interactions.
End with "===LOGS_END==="

SECTION 2 - ANALYSIS (in Persian/Farsi with Markdown formatting):
Start with "===ANALYSIS_START==="
Generate a comprehensive, REALISTIC-LOOKING but RANDOM scientific analysis in Persian using Markdown format.

CRITICAL REQUIREMENTS - Generate RANDOM but realistic data:
1. Make each analysis UNIQUE and VARIED (use random seed to vary results)
2. Data should look REALISTIC but is FICTIONAL (for demonstration)
3. Include SPECIFIC NUMBERS and PERCENTAGES (random but realistic)

Use these Markdown elements:
- Headers: # for main title, ## for sections, ### for subsections
- Bold: **text** for important terms, protein names, enzyme names, drug names
- Lists: Use - or * for bullet lists, numbers (1. 2. 3.) for numbered lists
- Paragraphs: Separate with blank lines

The analysis MUST include these sections with RANDOM but REALISTIC data:

1. # Main Title: Type and characteristics of the mutation
   - Describe the mutation type and its location (use POSITION RANGES only, e.g., "از موقعیت X تا Y")
   - DO NOT write full nucleotide sequences in the text - only mention position numbers
   - Mention mutation type (deletion/insertion/substitution/inversion) and position range
   - 3-4 sentences

2. ## Impact on Viral Strains (CRITICAL - Generate RANDOM varied results)
   Generate DIFFERENT impacts for different viral strains (make it varied):
   - Some strains become MORE DANGEROUS (specify percentage increase, e.g., "افزایش 35% در شدت بیماریزایی")
   - Some strains become LESS DANGEROUS (specify percentage decrease, e.g., "کاهش 22% در قدرت عفونت")
   - Some strains show MIXED effects (e.g., "افزایش 15% در سرعت تکثیر اما کاهش 8% در مقاومت")
   - List 4-6 different viral strains with SPECIFIC PERCENTAGE changes
   - Use bullet list format: - **نام ویروس**: [تغییرات با درصد مشخص]

3. ## Structural Changes (3D Structure Analysis - FOCUS HERE)
   Detailed description of 3D structural changes:
   - **Enzyme modifications**: Name 2-3 specific enzymes (e.g., "RNA polymerase", "Protease", "Reverse transcriptase")
     - How each enzyme's 3D structure changes
     - Changes in active site geometry
     - Impact on catalytic activity (specify percentage)
   - **Structural proteins**: Name 2-3 structural proteins (e.g., "Spike protein", "Capsid protein", "Membrane protein")
     - Conformational changes in 3D structure
     - Changes in binding angles and distances
     - Impact on viral assembly (specify percentage)
   - **Protein-protein interactions**: How the mutation affects interactions
     - Changes in binding affinities (specify percentage or fold change)
     - New interaction sites created or lost
   - Use scientific terminology about 3D structures: angles, distances, conformational states, folding patterns

4. ## Viral Stability Changes
   - Describe how viral stability changes (use random but realistic percentage)
   - Impact on environmental resistance
   - Changes in thermal stability
   - Effect on pH sensitivity
   - Include SPECIFIC NUMBERS (e.g., "کاهش 18% در پایداری در دمای 37 درجه")

5. ## Drug Resistance Analysis (Generate RANDOM varied results)
   Create FICTIONAL drug names and analyze resistance:
   - 2-3 drugs that become MORE RESISTANT (specify fold increase, e.g., "افزایش 5.2 برابری مقاومت")
   - 1-2 drugs that become LESS RESISTANT (specify percentage decrease, e.g., "کاهش 30% مقاومت")
   - 1-2 drugs with NO SIGNIFICANT CHANGE
   - Use drug names like: "Antiviral-X", "Inhibitor-Beta", "Therapeutic-Alpha" (fictional but realistic)
   - Explain mechanism: how structural changes affect drug binding

6. ## Risk Assessment
   - Overall risk percentage (generate random between 25-85%)
   - Include: "سطح خطر کلی: XX%"
   - Brief explanation of risk factors

7. ## Recommendations
   - Use a numbered list (1. 2. 3. 4. 5.) for 5 specific recommendations
   - Include recommendations about:
     - Drug development strategies
     - Monitoring specific viral strains
     - Structural biology studies
     - Therapeutic approaches

8. ## Data Table (CRITICAL - Must include ONE table with scientific data)
   Include ONE well-formatted Markdown table showing comparative data.
   The table can show any relevant information such as:
   - Comparison of different viral strains
   - Comparison of protein structural changes
   - Comparison of enzyme activities
   - Comparison of drug responses
   - Any other relevant scientific comparison
   
   Table format (use EXACT Markdown table syntax):
   | Header 1 | Header 2 | Header 3 |
   |----------|----------|----------|
   | Data 1   | Data 2   | Data 3   |
   | Data 4   | Data 5   | Data 6   |
   
   Requirements:
   - Must have at least 3-4 rows (including header)
   - Must have 3-5 columns
   - First row must be header row
   - Use Persian text for headers and data
   - Include numbers/percentages in cells
   - Place table after one of the main sections (e.g., after Structural Changes or Drug Resistance)

9. ## Chart Data (CRITICAL - Must include 1-3 charts with MARKED data)
   For each chart you want to display, use this EXACT format:
   [CHART:TITLE:label1,value1|label2,value2|label3,value3|...]
   
   Examples:
   - [CHART:تاثیر بر پروتئین‌های ساختاری:پروتئین اسپایک,85|پروتئین غشا,72|نوکلئوکپسید,68|پروتئین پوشش,79]
   - [CHART:مقاومت دارویی:رمدسیویر,92|پاکسلووید,78|مولنوپیراویر,65|فاویپیراویر,58]
   - [CHART:تغییرات فعالیت آنزیمی:RNA polymerase,88|Protease,74|Reverse transcriptase,81]
   
   Rules:
   - Generate 1-3 charts (use random number)
   - Title should be in Persian
   - Labels should be in Persian (protein names, drug names, etc.)
   - Values should be numbers between 0-100 (percentages)
   - Each chart should have 4-7 data points (random but realistic)
   - Place chart markers at the END of the relevant section
   - Each chart marker must be on a SEPARATE line
   - Format: [CHART:Title:item1,value1|item2,value2|item3,value3]

Format as clear, scientific Markdown text in Persian. Be detailed, use proper Markdown syntax.
Make EVERY analysis UNIQUE with different numbers, percentages, and results (use random seed to vary).
End with "===ANALYSIS_END==="

IMPORTANT: 
- Use the exact markers (===LOGS_START===, ===LOGS_END===, ===ANALYSIS_START===, ===ANALYSIS_END===) to separate sections.
- Generate RANDOM but REALISTIC data - each analysis should be different
- Focus on 3D STRUCTURAL CHANGES and PROTEIN CONFORMATIONS
- Include SPECIFIC NUMBERS and PERCENTAGES everywhere
- Make viral strain impacts VARIED (some increase, some decrease)
- Create FICTIONAL but REALISTIC-SOUNDING drug names`;

        const response = await fetch(getGeminiApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `API Error: ${response.status} ${response.statusText}`;
            
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error && errorData.error.message) {
                    errorMessage += ` - ${errorData.error.message}`;
                }
            } catch (e) {
                errorMessage += ` - ${errorText.substring(0, 200)}`;
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        // Log full response for debugging
        console.log('Gemini API Response:', data);
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Unexpected response structure:', data);
            throw new Error('No response from AI model. Response: ' + JSON.stringify(data));
        }

        const generatedText = data.candidates[0].content.parts[0].text;
        
        // Extract logs section
        const logsStart = generatedText.indexOf('===LOGS_START===');
        const logsEnd = generatedText.indexOf('===LOGS_END===');
        
        // Extract analysis section
        const analysisStart = generatedText.indexOf('===ANALYSIS_START===');
        const analysisEnd = generatedText.indexOf('===ANALYSIS_END===');
        
        let logs = [];
        let analysis = null;
        
        // Parse logs
        if (logsStart !== -1 && logsEnd !== -1) {
            const logsText = generatedText.substring(logsStart + 16, logsEnd).trim();
            logs = logsText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.startsWith('==='))
                .slice(0, 14); // Increased to 14 to match new prompt (10-14 log messages)
        }
        
        // Parse analysis
        if (analysisStart !== -1 && analysisEnd !== -1) {
            const analysisText = generatedText.substring(analysisStart + 21, analysisEnd).trim();
            
            // Extract risk score from analysis text (look for patterns like "X%" or "درصد X")
            const riskMatch = analysisText.match(/(\d+(?:\.\d+)?)\s*%/);
            const riskScore = riskMatch ? parseFloat(riskMatch[1]) : null;
            
            // Extract chart data from analysis text
            const chartData = extractChartData(analysisText);
            
            // Remove chart markers from analysis text for display
            const cleanAnalysisText = analysisText.replace(/\[CHART:[^\]]+\]/g, '').trim();
            
            analysis = {
                text: cleanAnalysisText,
                riskScore: riskScore,
                charts: chartData
            };
        }
        
        // Validate we got both sections
        if (logs.length === 0 || !analysis) {
            throw new Error('Incomplete response from AI: missing logs or analysis section');
        }
        
        return {
            logs: logs,
            analysis: analysis
        };
        
    } catch (error) {
        console.error('Error generating AI analysis:', error);
        throw error; // Re-throw to be handled by caller
    }
}

// Mutation type analysis
const mutationAnalysis = {
    substitution: {
        name: "جایگزینی نوکلئوتید",
        impact: "متوسط",
        description: "تغییر یک نوکلئوتید که بر کدون تاثیر می‌گذارد"
    },
    insertion: {
        name: "جهش درج", 
        impact: "بالا",
        description: "اضافه کردن نوکلئوتیدها که باعث تغییر قاب می‌شود"
    },
    deletion: {
        name: "جهش حذف",
        impact: "بالا", 
        description: "حذف نوکلئوتیدها که باعث تغییر قاب می‌شود"
    },
    inversion: {
        name: "جهش وارونگی",
        impact: "شدید",
        description: "معکوس کردن ترتیب نوکلئوتیدها"
    }
};

function initMutationPredictor() {
    generateRandomSequence();
    setupEventListeners();
    updateSequenceDisplay();
}

function generateRandomSequence() {
    const length = 200; // Generate 200 nucleotide sequence
    originalSequence = '';
    for (let i = 0; i < length; i++) {
        originalSequence += RNA_BASES[Math.floor(Math.random() * 4)];
    }
    currentSequence = originalSequence;
    sequenceLength = length;
    updateSequenceLength();
    sequenceHistory = [originalSequence]; // Initialize history
}

function updateSequenceLength() {
    document.getElementById('sequence-length').textContent = sequenceLength;
}

function updateSequenceDisplay() {
    const display = document.getElementById('sequence-display');
    display.innerHTML = '';
    
    for (let i = 0; i < currentSequence.length; i++) {
        const nucleotideContainer = document.createElement('div');
        nucleotideContainer.style.display = 'inline-block';
        nucleotideContainer.style.position = 'relative';
        nucleotideContainer.style.margin = '0.2rem';
        nucleotideContainer.style.textAlign = 'center';
        
        const nucleotide = document.createElement('span');
        nucleotide.className = `nucleotide ${currentSequence[i]}`;
        nucleotide.textContent = currentSequence[i];
        nucleotide.setAttribute('data-position', i + 1);
        
        const position = document.createElement('div');
        position.style.fontSize = '0.7rem';
        position.style.color = '#888';
        position.style.marginTop = '0.2rem';
        position.style.fontWeight = 'normal';
        position.textContent = i + 1;
        
        nucleotideContainer.appendChild(nucleotide);
        nucleotideContainer.appendChild(position);
        display.appendChild(nucleotideContainer);
    }
}


function setupEventListeners() {
    // Generate new sequence button
    document.getElementById('generate-sequence').addEventListener('click', () => {
        generateRandomSequence();
        updateSequenceDisplay();
        clearAnalysis();
        resetWizard();
    });

    // Undo mutation button
    document.getElementById('undo-mutation').addEventListener('click', () => {
        undoLastMutation();
    });

    // Mutation type buttons
    document.querySelectorAll('.mutation-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectMutationType(btn.getAttribute('data-type'));
        });
    });

    // Apply mutation button
    document.getElementById('apply-mutation').addEventListener('click', () => {
        applyMutation();
    });

    // Cancel mutation button
    document.getElementById('cancel-mutation').addEventListener('click', () => {
        resetWizard();
    });

    // Previous step buttons
    document.getElementById('prev-step-2').addEventListener('click', () => {
        showWizardStep(1);
    });

    document.getElementById('prev-step-3').addEventListener('click', () => {
        showWizardStep(2);
    });
}

function selectMutationType(type) {
    selectedMutationType = type;
    
    // Update button selection
    document.querySelectorAll('.mutation-type-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('selected');
    
    // Move to step 2
    showWizardStep(2);
    showMutationDetails(type);
}

function showWizardStep(step) {
    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(stepEl => {
        stepEl.classList.remove('active');
    });
    
    // Show selected step
    document.getElementById(`step-${step}`).classList.add('active');
    currentWizardStep = step;
}

function showMutationDetails(type) {
    const detailsContainer = document.getElementById('mutation-details');
    let html = '';
    
    switch (type) {
        case 'deletion':
            html = `
                <h5>حذف نوکلئوتیدها</h5>
                <p>از کدام نوکلئوتید شروع به حذف شود؟</p>
                <select id="start-nucleotide">
                    <option value="">انتخاب کنید...</option>
                </select>
                <p>تا کدام نوکلئوتید حذف شود؟</p>
                <select id="end-nucleotide">
                    <option value="">انتخاب کنید...</option>
                </select>
                <button id="confirm-deletion" class="control-btn">تایید و ادامه</button>
            `;
            break;
            
        case 'insertion':
            html = `
                <h5>درج نوکلئوتیدها</h5>
                <p>توالی که می‌خواهید اضافه کنید را وارد کنید:</p>
                <input type="text" id="insert-sequence" placeholder="مثال: AUG یا G" maxlength="20">
                <p>از کدام موقعیت شروع به درج شود؟</p>
                <select id="insert-position">
                    <option value="">انتخاب کنید...</option>
                </select>
                <button id="confirm-insertion" class="control-btn">تایید و ادامه</button>
            `;
            break;
            
        case 'inversion':
            html = `
                <h5>وارونگی نوکلئوتیدها</h5>
                <p>از کدام نوکلئوتید شروع به وارونگی شود؟</p>
                <select id="invert-start">
                    <option value="">انتخاب کنید...</option>
                </select>
                <p>تا کدام نوکلئوتید وارونگی شود؟</p>
                <select id="invert-end">
                    <option value="">انتخاب کنید...</option>
                </select>
                <button id="confirm-inversion" class="control-btn">تایید و ادامه</button>
            `;
            break;
            
        case 'substitution':
            html = `
                <h5>جایگزینی نوکلئوتیدها</h5>
                <p>از کدام نوکلئوتید شروع به جایگزینی شود؟</p>
                <select id="substitute-start">
                    <option value="">انتخاب کنید...</option>
                </select>
                <p>تا کدام نوکلئوتید جایگزینی شود؟</p>
                <select id="substitute-end">
                    <option value="">انتخاب کنید...</option>
                </select>
                <p>توالی جایگزین را وارد کنید:</p>
                <input type="text" id="substitute-sequence" placeholder="مثال: AUG" maxlength="20">
                <button id="confirm-substitution" class="control-btn">تایید و ادامه</button>
            `;
            break;
    }
    
    detailsContainer.innerHTML = html;
    populateNucleotideOptions();
    setupDetailEventListeners();
}

function populateNucleotideOptions() {
    const selects = document.querySelectorAll('#mutation-details select');
    selects.forEach(select => {
        select.innerHTML = '<option value="">انتخاب کنید...</option>';
        for (let i = 0; i < currentSequence.length; i++) {
            const option = document.createElement('option');
            option.value = i + 1;
            option.textContent = `موقعیت ${i + 1}: ${currentSequence[i]}`;
            select.appendChild(option);
        }
    });
}

function setupDetailEventListeners() {
    // Deletion
    const confirmDeletion = document.getElementById('confirm-deletion');
    if (confirmDeletion) {
        confirmDeletion.addEventListener('click', () => {
            const start = parseInt(document.getElementById('start-nucleotide').value);
            const end = parseInt(document.getElementById('end-nucleotide').value);
            
            if (!start || !end || start > end) {
                alert('موقعیت‌های انتخاب شده نامعتبر است');
                return;
            }
            
            mutationData = {
                type: 'deletion',
                start: start,
                end: end,
                deleted: currentSequence.substring(start - 1, end)
            };
            
            showMutationSummary();
        });
    }
    
    // Insertion
    const confirmInsertion = document.getElementById('confirm-insertion');
    if (confirmInsertion) {
        confirmInsertion.addEventListener('click', () => {
            const sequence = document.getElementById('insert-sequence').value.toUpperCase();
            const position = parseInt(document.getElementById('insert-position').value);
            
            if (!sequence || !position || !isValidSequence(sequence)) {
                alert('توالی یا موقعیت نامعتبر است');
                return;
            }
            
            mutationData = {
                type: 'insertion',
                position: position,
                inserted: sequence
            };
            
            showMutationSummary();
        });
    }
    
    // Inversion
    const confirmInversion = document.getElementById('confirm-inversion');
    if (confirmInversion) {
        confirmInversion.addEventListener('click', () => {
            const start = parseInt(document.getElementById('invert-start').value);
            const end = parseInt(document.getElementById('invert-end').value);
            
            if (!start || !end || start > end) {
                alert('موقعیت‌های انتخاب شده نامعتبر است');
                return;
            }
            
            mutationData = {
                type: 'inversion',
                start: start,
                end: end,
                inverted: currentSequence.substring(start - 1, end)
            };
            
            showMutationSummary();
        });
    }
    
    // Substitution
    const confirmSubstitution = document.getElementById('confirm-substitution');
    if (confirmSubstitution) {
        confirmSubstitution.addEventListener('click', () => {
            const start = parseInt(document.getElementById('substitute-start').value);
            const end = parseInt(document.getElementById('substitute-end').value);
            const sequence = document.getElementById('substitute-sequence').value.toUpperCase();
            
            if (!start || !end || !sequence || start > end || !isValidSequence(sequence)) {
                alert('اطلاعات وارد شده نامعتبر است');
                return;
            }
            
            const originalLength = end - start + 1;
            const newLength = sequence.length;
            
            if (originalLength !== newLength) {
                alert(`طول توالی اصلی (${originalLength} نوکلئوتید) با طول توالی جایگزین (${newLength} نوکلئوتید) برابر نیست`);
                return;
            }
            
            mutationData = {
                type: 'substitution',
                start: start,
                end: end,
                original: currentSequence.substring(start - 1, end),
                substituted: sequence
            };
            
            showMutationSummary();
        });
    }
}

function showMutationSummary() {
    const summaryContainer = document.getElementById('mutation-summary');
    let summary = '';
    
    switch (mutationData.type) {
        case 'deletion':
            summary = `
                <h5>خلاصه جهش حذف</h5>
                <p><strong>نوع:</strong> حذف نوکلئوتیدها</p>
                <p><strong>موقعیت:</strong> از ${mutationData.start} تا ${mutationData.end}</p>
                <p><strong>توالی حذف شده:</strong> ${mutationData.deleted}</p>
            `;
            break;
            
        case 'insertion':
            summary = `
                <h5>خلاصه جهش درج</h5>
                <p><strong>نوع:</strong> درج نوکلئوتیدها</p>
                <p><strong>موقعیت:</strong> ${mutationData.position}</p>
                <p><strong>توالی اضافه شده:</strong> ${mutationData.inserted}</p>
            `;
            break;
            
        case 'inversion':
            summary = `
                <h5>خلاصه جهش وارونگی</h5>
                <p><strong>نوع:</strong> وارونگی نوکلئوتیدها</p>
                <p><strong>موقعیت:</strong> از ${mutationData.start} تا ${mutationData.end}</p>
                <p><strong>توالی وارونه شده:</strong> ${mutationData.inverted}</p>
            `;
            break;
            
        case 'substitution':
            summary = `
                <h5>خلاصه جهش جایگزینی</h5>
                <p><strong>نوع:</strong> جایگزینی نوکلئوتیدها</p>
                <p><strong>موقعیت:</strong> از ${mutationData.start} تا ${mutationData.end}</p>
                <p><strong>توالی اصلی:</strong> ${mutationData.original}</p>
                <p><strong>توالی جایگزین:</strong> ${mutationData.substituted}</p>
            `;
            break;
    }
    
    summaryContainer.innerHTML = summary;
    showWizardStep(3);
}

function applyMutation() {
    if (isAnalyzing) {
        alert('تحلیل قبلی هنوز در حال انجام است');
        return;
    }

    // Save current sequence to history before mutation
    sequenceHistory.push(currentSequence);
    
    // Store original sequence for mutation info
    const originalSequence = currentSequence;

    let mutatedSequence = currentSequence;
    let mutationInfo = {};

    switch (mutationData.type) {
        case 'deletion':
            // For deletion, create sequence without deleted part
            mutatedSequence = currentSequence.substring(0, mutationData.start - 1) + 
                             currentSequence.substring(mutationData.end);
            mutationInfo = {
                type: 'deletion',
                position: mutationData.start,
                endPosition: mutationData.end,
                deleted: mutationData.deleted,
                length: mutationData.deleted.length,
                originalSequence: originalSequence,
                mutatedSequence: mutatedSequence,
                affectedRegion: `${mutationData.start}-${mutationData.end}`
            };
            break;

        case 'insertion':
            mutatedSequence = currentSequence.substring(0, mutationData.position - 1) + 
                             mutationData.inserted + 
                             currentSequence.substring(mutationData.position - 1);
            mutationInfo = {
                type: 'insertion',
                position: mutationData.position,
                inserted: mutationData.inserted,
                length: mutationData.inserted.length,
                originalSequence: originalSequence,
                mutatedSequence: mutatedSequence,
                affectedRegion: `${mutationData.position} (inserted after position)`
            };
            break;

        case 'inversion':
            const reversedSeq = mutationData.inverted.split('').reverse().join('');
            mutatedSequence = currentSequence.substring(0, mutationData.start - 1) + 
                             reversedSeq + 
                             currentSequence.substring(mutationData.end);
            mutationInfo = {
                type: 'inversion',
                position: mutationData.start,
                endPosition: mutationData.end,
                original: mutationData.inverted,
                inverted: reversedSeq,
                length: mutationData.inverted.length,
                originalSequence: originalSequence,
                mutatedSequence: mutatedSequence,
                affectedRegion: `${mutationData.start}-${mutationData.end}`
            };
            break;

        case 'substitution':
            mutatedSequence = currentSequence.substring(0, mutationData.start - 1) + 
                             mutationData.substituted + 
                             currentSequence.substring(mutationData.end);
            mutationInfo = {
                type: 'substitution',
                position: mutationData.start,
                endPosition: mutationData.end,
                original: mutationData.original,
                mutated: mutationData.substituted,
                length: mutationData.original.length,
                originalSequence: originalSequence,
                mutatedSequence: mutatedSequence,
                affectedRegion: `${mutationData.start}-${mutationData.end}`
            };
            break;
    }

    currentSequence = mutatedSequence;
    sequenceLength = mutatedSequence.length;
    updateSequenceLength();
    updateSequenceDisplay();
    
    // Highlight mutated nucleotides
    highlightMutation(mutationInfo);
    
    // Start AI analysis
    startAIAnalysis(mutationInfo);
    
    // Reset wizard
    resetWizard();
}

function resetWizard() {
    currentWizardStep = 1;
    selectedMutationType = '';
    mutationData = {};
    
    // Reset button selections
    document.querySelectorAll('.mutation-type-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Show step 1
    showWizardStep(1);
    
    // Clear details and summary
    document.getElementById('mutation-details').innerHTML = '';
    document.getElementById('mutation-summary').innerHTML = '';
}

function undoLastMutation() {
    if (sequenceHistory.length > 1) {
        sequenceHistory.pop(); // Remove current sequence
        currentSequence = sequenceHistory[sequenceHistory.length - 1]; // Get previous sequence
        sequenceLength = currentSequence.length;
        updateSequenceLength();
        updateSequenceDisplay();
        clearAnalysis();
        resetWizard();
    } else {
        alert('هیچ تغییری برای بازگردانی وجود ندارد');
    }
}

function isValidSequence(seq) {
    return seq.split('').every(base => RNA_BASES.includes(base));
}

function highlightMutation(mutationInfo) {
    const nucleotides = document.querySelectorAll('.nucleotide');
    
    // Clear previous highlights
    nucleotides.forEach(nuc => nuc.classList.remove('mutated', 'deleted'));
    
    // Highlight mutated nucleotides based on mutation type
    if (mutationInfo.type === 'deletion') {
        // For deletion, only mark the deleted nucleotides with X animation
        const startPos = mutationInfo.position - 1;
        const length = mutationInfo.length || 1;
        
        for (let i = startPos; i < startPos + length && i < nucleotides.length; i++) {
            nucleotides[i].classList.add('deleted');
        }
    } else {
        // For other mutations, highlight the affected area
        const startPos = mutationInfo.position - 1;
        const length = mutationInfo.length || 1;
        
        for (let i = startPos; i < startPos + length && i < nucleotides.length; i++) {
            nucleotides[i].classList.add('mutated');
        }
    }
}

async function startAIAnalysis(mutationInfo) {
    isAnalyzing = true;
    const thinkingContainer = document.getElementById('thinking-logs');
    const resultsContainer = document.getElementById('analysis-results');
    
    // Clear previous results
    thinkingContainer.innerHTML = '';
    resultsContainer.innerHTML = '';
    
    // Hide prediction charts section until new charts are generated
    const predictionChartsSection = document.querySelector('.prediction-charts');
    if (predictionChartsSection) {
        predictionChartsSection.classList.remove('visible');
        // Clear charts container
        const chartsContainer = document.getElementById('charts-container');
        if (chartsContainer) {
            chartsContainer.innerHTML = '';
        }
    }
    
    let loadingDotsInterval = null;
    let messageRotationInterval = null;
    let timerInterval = null;
    let timerSeconds = 0;
    
    // Array of rotating messages to keep user engaged
    const loadingMessages = [
        'Connecting to AI analysis system',
        'Initializing neural network models',
        'Loading protein structure database',
        'Analyzing mutation patterns',
        'Processing genomic sequence data',
        'Calibrating prediction algorithms',
        'Running molecular simulations',
        'Computing structural impacts',
        'Evaluating clinical significance',
        'Generating comprehensive analysis',
        'Cross-referencing scientific literature',
        'Optimizing analysis parameters'
    ];
    
    try {
        // Add timer at the top of ai-thinking container
        const aiThinkingContainer = document.getElementById('ai-thinking');
        let timerElement = null;
        if (aiThinkingContainer) {
            timerElement = document.createElement('div');
            timerElement.className = 'ai-timer';
            timerElement.textContent = '00:00';
            aiThinkingContainer.appendChild(timerElement);
            
            // Start timer
            timerSeconds = 0;
            timerInterval = setInterval(() => {
                timerSeconds++;
                const minutes = Math.floor(timerSeconds / 60);
                const seconds = timerSeconds % 60;
                if (timerElement) {
                    timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                }
            }, 1000);
        }
        
        // Show initial loading message with animated dots
        let currentMessageIndex = 0;
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'thinking-log loading';
        
        const updateLoadingMessage = () => {
            loadingDiv.innerHTML = `>>> ${loadingMessages[currentMessageIndex]}<span class="loading-dots"></span>`;
        };
        
        updateLoadingMessage();
        thinkingContainer.innerHTML = '';
        thinkingContainer.appendChild(loadingDiv);
        
        // Animate loading dots
        let dotCount = 0;
        loadingDotsInterval = setInterval(() => {
            dotCount = (dotCount % 3) + 1;
            const dotsElement = loadingDiv.querySelector('.loading-dots');
            if (dotsElement) {
                dotsElement.textContent = '.'.repeat(dotCount);
            }
        }, 500); // Change every 500ms (. -> .. -> ... -> .)
        
        // Rotate messages every 2.5 seconds
        messageRotationInterval = setInterval(() => {
            currentMessageIndex = (currentMessageIndex + 1) % loadingMessages.length;
            updateLoadingMessage();
        }, 2500);
        
        // Generate complete analysis with logs and analysis using Gemini API
        const aiResponse = await generateFullAIAnalysis(mutationInfo);
        
        // Stop all animations and timers
        if (loadingDotsInterval) {
            clearInterval(loadingDotsInterval);
            loadingDotsInterval = null;
        }
        if (messageRotationInterval) {
            clearInterval(messageRotationInterval);
            messageRotationInterval = null;
        }
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        if (timerElement && timerElement.parentNode) {
            timerElement.parentNode.removeChild(timerElement);
        }
        
        // Clear loading message
        thinkingContainer.innerHTML = '';
        
        // Show thinking process with generated logs
        showThinkingProcess(thinkingContainer, aiResponse.logs).then(() => {
            // After all logs are finished, show analysis
            showAIAnalysisResults(resultsContainer, aiResponse.analysis, mutationInfo);
        isAnalyzing = false;
        });
        
    } catch (error) {
        // Make sure all intervals are cleared
        if (loadingDotsInterval) {
            clearInterval(loadingDotsInterval);
            loadingDotsInterval = null;
        }
        if (messageRotationInterval) {
            clearInterval(messageRotationInterval);
            messageRotationInterval = null;
        }
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // Remove timer element
        const aiThinkingContainer = document.getElementById('ai-thinking');
        if (aiThinkingContainer) {
            const timerElement = aiThinkingContainer.querySelector('.ai-timer');
            if (timerElement && timerElement.parentNode) {
                timerElement.parentNode.removeChild(timerElement);
            }
        }
        
        // Show error message instead of fallback
        isAnalyzing = false;
        thinkingContainer.innerHTML = `
            <div class="thinking-log" style="color: #ff4444;">
                >>> ERROR: Failed to connect to AI analysis system
            </div>
            <div class="thinking-log" style="color: #ff4444;">
                >>> ${error.message}
            </div>
            <div class="thinking-log" style="color: #ffaa00;">
                >>> Please check your API key or try again later
            </div>
        `;
        
        resultsContainer.innerHTML = `
            <div style="color: #ff4444; text-align: center; padding: 2rem;">
                <h4 style="color: #ff4444;">خطا در اتصال به هوش مصنوعی</h4>
                <p>متأسفانه امکان اتصال به سرویس تحلیل هوش مصنوعی فراهم نیست.</p>
                <p style="font-size: 0.9rem; color: #888;">خطا: ${error.message}</p>
            </div>
        `;
    }
}

function showThinkingProcess(container, logs) {
    return new Promise((resolve) => {
        let logIndex = 0;
        
        const addLog = () => {
            if (logIndex < logs.length) {
                const logDiv = document.createElement('div');
                logDiv.className = 'thinking-log typewriter';
                container.appendChild(logDiv);
                
                const fullText = '>>> ' + logs[logIndex];
                let currentIndex = 0;
                const charDelay = 30; // milliseconds per character
                
                const typeChar = () => {
                    if (currentIndex < fullText.length) {
                        logDiv.textContent = fullText.substring(0, currentIndex + 1);
                        currentIndex++;
                        // Scroll to bottom to show newest text - use requestAnimationFrame for smooth scroll
                        requestAnimationFrame(() => {
                            const logsContainer = document.getElementById('pandemic-thinking-logs');
                            if (logsContainer && logsContainer.scrollHeight > logsContainer.clientHeight) {
                                logsContainer.scrollTop = logsContainer.scrollHeight;
                            }
                        });
                        setTimeout(typeChar, charDelay);
                    } else {
                        logDiv.classList.add('completed');
                        logDiv.classList.remove('typewriter');
                        
                        // Ensure scroll to bottom after completion
                        requestAnimationFrame(() => {
                            const logsContainer = document.getElementById('pandemic-thinking-logs');
                            if (logsContainer && logsContainer.scrollHeight > logsContainer.clientHeight) {
                                logsContainer.scrollTop = logsContainer.scrollHeight;
                            }
                        });
                        
                        logIndex++;
                        
                        const gapDuration = 200;
                        if (logIndex < logs.length) {
                            setTimeout(addLog, gapDuration);
                        } else {
                            setTimeout(() => {
                                resolve();
                            }, gapDuration);
                        }
                    }
                };
                
                typeChar();
            }
        };
        
        addLog();
    });
}

// Parse Markdown to HTML
function parseMarkdownToHTML(text) {
    if (!text) return '';
    
    // Remove chart markers before parsing
    text = text.replace(/\[CHART(_(PIE|SCATTER|BAR))?:[^\]]+\]/g, '').trim();
    
    // Split by lines to process line by line
    const lines = text.split('\n');
    const result = [];
    let inList = false;
    let listType = null; // 'ul' or 'ol'
    let listItems = [];
    let inTable = false;
    let tableRows = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for Markdown table (starts with |)
        if (line.startsWith('|') && line.endsWith('|')) {
            // Close lists if open
            if (inList) {
                result.push((listType === 'ol' ? '<ol>' : '<ul>') + listItems.join('') + (listType === 'ol' ? '</ol>' : '</ul>'));
                listItems = [];
                inList = false;
                listType = null;
            }
            
            // Parse table row
            const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
            
            // Check if this is a separator row (header separator)
            if (cells.every(cell => cell.match(/^[-:]+$/))) {
                continue; // Skip separator row
            }
            
            if (!inTable) {
                inTable = true;
                tableRows = [];
            }
            
            tableRows.push(cells);
            continue;
        } else {
            // Not a table row - close table if open
            if (inTable) {
                result.push(renderTable(tableRows));
                tableRows = [];
                inTable = false;
            }
        }
        
        if (!line) {
            // Empty line - close list if open and add paragraph break
            if (inList) {
                result.push((listType === 'ol' ? '<ol>' : '<ul>') + listItems.join('') + (listType === 'ol' ? '</ol>' : '</ul>'));
                listItems = [];
                inList = false;
                listType = null;
            }
            continue;
        }
        
        // Headers (process in order from most specific to least)
        if (line.startsWith('### ')) {
            if (inList) {
                result.push((listType === 'ol' ? '<ol>' : '<ul>') + listItems.join('') + (listType === 'ol' ? '</ol>' : '</ul>'));
                listItems = [];
                inList = false;
                listType = null;
            }
            result.push('<h3>' + processInline(line.substring(4)) + '</h3>');
            continue;
        }
        if (line.startsWith('## ')) {
            if (inList) {
                result.push((listType === 'ol' ? '<ol>' : '<ul>') + listItems.join('') + (listType === 'ol' ? '</ol>' : '</ul>'));
                listItems = [];
                inList = false;
                listType = null;
            }
            result.push('<h2>' + processInline(line.substring(3)) + '</h2>');
            continue;
        }
        if (line.startsWith('# ')) {
            if (inList) {
                result.push((listType === 'ol' ? '<ol>' : '<ul>') + listItems.join('') + (listType === 'ol' ? '</ol>' : '</ul>'));
                listItems = [];
                inList = false;
                listType = null;
            }
            result.push('<h1>' + processInline(line.substring(2)) + '</h1>');
            continue;
        }
        
        // Ordered list (1. item)
        const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
        if (orderedMatch) {
            if (!inList || listType !== 'ol') {
                if (inList) {
                    result.push((listType === 'ol' ? '<ol>' : '<ul>') + listItems.join('') + (listType === 'ol' ? '</ol>' : '</ul>'));
                }
                listItems = [];
                inList = true;
                listType = 'ol';
            }
            listItems.push('<li>' + processInline(orderedMatch[1]) + '</li>');
            continue;
        }
        
        // Unordered list (- item or * item)
        const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
        if (unorderedMatch) {
            if (!inList || listType !== 'ul') {
                if (inList) {
                    result.push((listType === 'ol' ? '<ol>' : '<ul>') + listItems.join('') + (listType === 'ol' ? '</ol>' : '</ul>'));
                }
                listItems = [];
                inList = true;
                listType = 'ul';
            }
            listItems.push('<li>' + processInline(unorderedMatch[1]) + '</li>');
            continue;
        }
        
        // Regular paragraph
        if (inList) {
            result.push((listType === 'ol' ? '<ol>' : '<ul>') + listItems.join('') + (listType === 'ol' ? '</ol>' : '</ul>'));
            listItems = [];
            inList = false;
            listType = null;
        }
        result.push('<p>' + processInline(line) + '</p>');
    }
    
    // Close any remaining list
    if (inList) {
        result.push((listType === 'ol' ? '<ol>' : '<ul>') + listItems.join('') + (listType === 'ol' ? '</ol>' : '</ul>'));
    }
    
    // Close any remaining table
    if (inTable && tableRows.length > 0) {
        result.push(renderTable(tableRows));
    }
    
    return result.join('\n');
}

// Render Markdown table as HTML
function renderTable(rows) {
    if (rows.length === 0) return '';
    
    let html = '<table class="markdown-table">';
    
    rows.forEach((row, index) => {
        html += '<tr>';
        row.forEach(cell => {
            const tag = index === 0 ? 'th' : 'td';
            html += `<${tag}>${processInline(cell)}</${tag}>`;
        });
        html += '</tr>';
    });
    
    html += '</table>';
    return html;
}

// Extract chart data from analysis text (for mutation prediction)
function extractChartData(text) {
    const charts = [];
    // Pattern: [CHART:Title:label1,value1|label2,value2|...]
    const chartPattern = /\[CHART:([^:]+):([^\]]+)\]/g;
    let match;
    
    while ((match = chartPattern.exec(text)) !== null) {
        const title = match[1].trim();
        const dataString = match[2].trim();
        
        // Parse data: label1,value1|label2,value2|...
        const dataPoints = dataString.split('|').map(item => {
            const parts = item.split(',');
            if (parts.length === 2) {
                const label = parts[0].trim();
                const value = parseFloat(parts[1].trim());
                if (!isNaN(value) && value >= 0 && value <= 100) {
                    return { label, value };
                }
            }
            return null;
        }).filter(item => item !== null);
        
        if (dataPoints.length > 0) {
            charts.push({
                title: title,
                data: dataPoints
            });
        }
    }
    
    return charts;
}

// Extract chart data from pandemic analysis text (supports PIE, SCATTER, BAR)
function extractPandemicChartData(text) {
    const charts = [];
    // Pattern: [CHART_TYPE:Title:label1,value1|label2,value2|...]
    const chartPattern = /\[CHART_(PIE|SCATTER|BAR):([^:]+):([^\]]+)\]/g;
    let match;
    
    while ((match = chartPattern.exec(text)) !== null) {
        const chartType = match[1].trim();
        const title = match[2].trim();
        const dataString = match[3].trim();
        
        // Parse data: label1,value1|label2,value2|...
        const dataPoints = dataString.split('|').map(item => {
            const parts = item.split(',');
            if (parts.length === 2) {
                const label = parts[0].trim();
                const value = parseFloat(parts[1].trim());
                if (!isNaN(value)) {
                    return { label, value };
                }
            }
            return null;
        }).filter(item => item !== null);
        
        if (dataPoints.length > 0) {
            charts.push({
                type: chartType.toLowerCase(),
                title: title,
                data: dataPoints
            });
        }
    }
    
    return charts;
}

// Process inline Markdown (bold, italic, code)
function processInline(text) {
    // Code (`code`) - process first to avoid conflicts
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold (**text** or __text__) - process before italic
    text = text.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>');
    
    // Italic (*text* or _text_) - simple approach: single asterisk/underscore between word boundaries
    // Only replace if not already part of bold
    text = text.replace(/\b\*([^*\n\*]+?)\*\b/g, '<em>$1</em>');
    text = text.replace(/\b_([^_\n_]+?)_\b/g, '<em>$1</em>');
    
    return text;
}

// Display AI-generated analysis results
function showAIAnalysisResults(container, analysis, mutationInfo) {
    const riskScore = analysis.riskScore || 50; // Default if not extracted
    const riskLevel = riskScore > 70 ? 'بالا' : riskScore > 40 ? 'متوسط' : 'پایین';
    const riskClass = riskScore > 70 ? 'risk-high' : riskScore > 40 ? 'risk-medium' : 'risk-low';
    
    // Parse Markdown to HTML
    const parsedHTML = parseMarkdownToHTML(analysis.text);
    
    container.innerHTML = `
        <div class="analysis-summary">
            <h4>تحلیل هوش مصنوعی جهش: <span class="${riskClass}">${mutationInfo.type}</span></h4>
            ${riskScore ? `<p><span class="keyword-highlight">سطح خطر پیش‌بینی شده:</span> <span class="${riskClass}">${riskLevel} (${riskScore.toFixed(1)}%)</span></p>` : ''}
        </div>
        
        <div class="ai-analysis-text">
            ${parsedHTML}
        </div>
    `;
    
    // Generate charts if chart data is available (but hide them initially)
    if (analysis.charts && analysis.charts.length > 0) {
        createShowChartsButton(analysis.charts);
    }
}

function calculateRiskScore(mutationInfo) {
    let baseScore = 0;
    
    switch (mutationInfo.type) {
        case 'substitution':
            baseScore = 30;
            break;
        case 'insertion':
            baseScore = 70;
            break;
        case 'deletion':
            baseScore = 80;
            break;
        case 'inversion':
            baseScore = 90;
            break;
    }
    
    // Add randomness for realism
    return Math.min(100, baseScore + Math.random() * 20 - 10);
}

function calculateProteinImpact(mutationInfo) {
    const proteins = ['پروتئین اسپایک', 'پروتئین غشا', 'نوکلئوکپسید', 'پروتئین پوشش'];
    const impacts = {};
    
    proteins.forEach(protein => {
        impacts[protein] = {
            affected: Math.random() > 0.3,
            severity: Math.random() * 100,
            change: Math.random() > 0.5 ? 'افزایش یافته' : 'کاهش یافته'
        };
    });
    
    return impacts;
}

function calculateDrugResistance(mutationInfo) {
    const drugs = ['رمدسیویر', 'پاکسلووید', 'مولنوپیراویر', 'فاویپیراویر'];
    const resistance = {};
    
    drugs.forEach(drug => {
        resistance[drug] = {
            resistance: Math.random() * 100,
            mechanism: Math.random() > 0.5 ? 'جهش محل اتصال' : 'تغییر مسیر متابولیک'
        };
    });
    
    return resistance;
}

function generateRecommendations(riskScore, proteinImpact) {
    const recommendations = [];
    
    if (riskScore > 70) {
        recommendations.push('⚠️ جهش پرخطر شناسایی شد - نظارت فوری مورد نیاز است');
    }
    
    if (Object.values(proteinImpact).some(p => p.affected && p.severity > 50)) {
        recommendations.push('🧬 تغییرات قابل توجه در ساختار پروتئین پیش‌بینی می‌شود');
    }
    
    recommendations.push('📊 نظارت مداوم توصیه می‌شود');
    recommendations.push('🔬 اعتبارسنجی آزمایشگاهی پیشنهاد می‌شود');
    
    return recommendations;
}

function showAnalysisResults(container, analysis) {
    const riskLevel = analysis.riskScore > 70 ? 'بالا' : analysis.riskScore > 40 ? 'متوسط' : 'پایین';
    const riskClass = analysis.riskScore > 70 ? 'risk-high' : analysis.riskScore > 40 ? 'risk-medium' : 'risk-low';
    
    container.innerHTML = `
        <div class="analysis-summary">
            <h4>تحلیل جهش: <span class="${riskClass}">${analysis.mutationType.name}</span></h4>
            <p><span class="keyword-highlight">نوع تغییر:</span> ${analysis.mutationType.description}</p>
            <p><span class="keyword-highlight">سطح خطر:</span> <span class="${riskClass}">${riskLevel} (${analysis.riskScore.toFixed(1)}%)</span></p>
            <p><span class="keyword-highlight">تاثیر بر رفتار ویروس:</span> ${analysis.impact || analysis.mutationType.impact}</p>
            ${analysis.clinicalImplications ? `<p><span class="keyword-highlight">پیامدهای بالینی:</span> ${analysis.clinicalImplications}</p>` : ''}
        </div>
        
        <div class="protein-analysis">
            <h4>تاثیر بر پروتئین‌ها:</h4>
            ${Object.entries(analysis.proteinImpact).map(([protein, impact]) => `
                <div class="protein-item">
                    <span class="protein-name">${protein}:</span>
                    <span class="impact-level ${impact.affected ? 'affected' : 'normal'}">
                        ${impact.affected ? `تغییر یافته (${impact.severity.toFixed(1)}%)` : 'بدون تغییر'}
                    </span>
                </div>
            `).join('')}
        </div>
        
        <div class="drug-resistance">
            <h4>مقاومت دارویی:</h4>
            ${Object.entries(analysis.drugResistance).map(([drug, resistance]) => `
                <div class="drug-item">
                    <span class="drug-name">${drug}:</span>
                    <span class="resistance-level">${resistance.resistance.toFixed(1)}% مقاومت</span>
                </div>
            `).join('')}
        </div>
        
        <div class="recommendations">
            <h4>توصیه‌ها:</h4>
            <ul>
                ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    `;
}

// Create show charts button (charts are hidden initially)
function createShowChartsButton(charts) {
    const chartsContainer = document.getElementById('charts-container');
    if (!chartsContainer) {
        console.error('Charts container not found');
        return;
    }
    
    // Show the prediction-charts section
    const predictionChartsSection = document.querySelector('.prediction-charts');
    if (predictionChartsSection) {
        predictionChartsSection.classList.add('visible');
    }
    
    // Clear previous content
    chartsContainer.innerHTML = '';
    
    // Create button
    const button = document.createElement('button');
    button.className = 'show-charts-btn';
    button.textContent = 'نمایش نمودارها';
    button.innerHTML = '<span class="btn-icon">📊</span> نمایش نمودارهای پیش‌بینی';
    
    // Create hidden charts container
    const hiddenChartsContainer = document.createElement('div');
    hiddenChartsContainer.className = 'hidden-charts-container';
    hiddenChartsContainer.style.display = 'none';
    
    // Generate charts inside hidden container
    generateDynamicCharts(charts, hiddenChartsContainer);
    
    // Add click handler
    button.addEventListener('click', () => {
        button.style.display = 'none';
        hiddenChartsContainer.style.display = 'block';
        
        // Trigger animation
        setTimeout(() => {
            hiddenChartsContainer.classList.add('charts-visible');
            // Trigger chart animations
            triggerChartAnimations(hiddenChartsContainer);
        }, 50);
    });
    
    chartsContainer.appendChild(button);
    chartsContainer.appendChild(hiddenChartsContainer);
}

// Generate dynamic charts from AI-provided data
function generateDynamicCharts(charts, container = null) {
    const chartsContainer = container || document.getElementById('charts-container');
    if (!chartsContainer) {
        console.error('Charts container not found');
        return;
    }
    
    if (!container) {
        // Clear previous charts only if not in hidden container
        chartsContainer.innerHTML = '';
    }
    
    // Create a chart for each data set
    charts.forEach((chart, chartIndex) => {
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'chart-wrapper';
        
        const chartTitle = document.createElement('h4');
        chartTitle.textContent = chart.title;
        chartWrapper.appendChild(chartTitle);
        
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        
        // Calculate available height for bars
        const chartHeight = 400; // Fixed height
        const paddingTop = 20;
        const paddingBottom = 20;
        const availableHeight = chartHeight - paddingTop - paddingBottom;
        
        const maxValue = 100; // Assuming percentage values
        
        // Create bar items
        chart.data.forEach((item, index) => {
            const barItem = document.createElement('div');
            barItem.className = 'bar-item';
            barItem.setAttribute('role', 'listitem');
            barItem.setAttribute('aria-label', `${item.label}: ${item.value}%`);
            
            // Value label (on top)
            const barValue = document.createElement('div');
            barValue.className = 'bar-value';
            barValue.textContent = `${item.value}%`;
            
            // Bar itself
            const bar = document.createElement('div');
            bar.className = 'bar';
            
            // Label (at bottom)
            const barLabel = document.createElement('div');
            barLabel.className = 'bar-label';
            barLabel.textContent = item.label;
            
            // Assemble
            barItem.appendChild(barValue);
            barItem.appendChild(bar);
            barItem.appendChild(barLabel);
            chartContainer.appendChild(barItem);
            
            // Calculate bar height
            const barHeight = (item.value / maxValue) * availableHeight;
            
            // Store height for later animation
            bar.dataset.height = barHeight;
        });
        
        chartWrapper.appendChild(chartContainer);
        chartsContainer.appendChild(chartWrapper);
    });
}

// Helper to trigger chart bar animations
function triggerChartAnimations(container) {
    const chartWrappers = container.querySelectorAll('.chart-wrapper');
    chartWrappers.forEach((wrapper, chartIndex) => {
        setTimeout(() => {
            wrapper.classList.add('chart-animated');
            const barItems = wrapper.querySelectorAll('.bar-item');
            barItems.forEach((barItem, barIndex) => {
                setTimeout(() => {
                    barItem.classList.add('visible');
                    const bar = barItem.querySelector('.bar');
                    if (bar) {
                        const barHeight = parseFloat(bar.dataset.height || '0');
                        bar.style.height = `${barHeight}px`;
                    }
                }, 200 * (chartIndex * 10 + barIndex + 1));
            });
        }, chartIndex * 300);
    });
}


function clearAnalysis() {
    document.getElementById('thinking-logs').innerHTML = '';
    document.getElementById('analysis-results').innerHTML = '';
    
    // Clear highlights
    const nucleotides = document.querySelectorAll('.nucleotide');
    nucleotides.forEach(nuc => nuc.classList.remove('mutated', 'deleted'));
    
    // Clear charts
    const chartsContainer = document.getElementById('charts-container');
    if (chartsContainer) {
        chartsContainer.innerHTML = '';
    }
}

// ==================== INITIALIZATION ====================
window.addEventListener('load', () => {
    // Initialize content
    populateContent();
    
    // Initialize components
    initLenis(); // Initialize Lenis smooth scroll first
    initThreeBackground();
    initScrollAnimations();
    // initVisualDiagrams(); // Removed - only virus simulation remains
    initVirusSimulation();
    initVirusIntelligenceAnimation();
    initNGSAnimation();
    initLSTMAnimation();
    initLSTMSectionAnimation();
    initPredictionAnimation();
    initTransformerAnimation();
    initImmuneEscapeAnimation();
    initImmuneMemoryAnimation();
    initAIVaccineAnimation();
    initMutationPredictor();
    initNewPandemicSimulation();
    
});

// ==================== PANDEMIC SIMULATION ====================
let pandemicMatrix = null;
let matrixCanvas = null;
let matrixCtx = null;
let pandemicData = null;
let vaccineData = null;
let isSimulating = false;
let isDesigningVaccine = false;

const MATRIX_SIZE = 30; // 30x30 grid
const CELL_SIZE = 13;

const POPULATION_STATES = {
    HEALTHY: 0,
    INFECTED: 1,
    SEVERE: 2,
    FATAL: 3,
    RECOVERED: 4,
    VACCINATED: 5
};

const STATE_COLORS = {
    [POPULATION_STATES.HEALTHY]: '#00ff88',
    [POPULATION_STATES.INFECTED]: '#ffaa00',
    [POPULATION_STATES.SEVERE]: '#ff6600',
    [POPULATION_STATES.FATAL]: '#ff0000',
    [POPULATION_STATES.RECOVERED]: '#00aaff',
    [POPULATION_STATES.VACCINATED]: '#8800ff'
};

// Initialize pandemic simulation
function initPandemicSimulation() {
    const canvas = document.getElementById('matrix-canvas');
    if (!canvas) return;
    
    matrixCanvas = canvas;
    matrixCtx = canvas.getContext('2d');
    canvas.width = MATRIX_SIZE * CELL_SIZE;
    canvas.height = MATRIX_SIZE * CELL_SIZE;
    
    // Initialize matrix with healthy population
    pandemicMatrix = Array(MATRIX_SIZE).fill(null).map(() => 
        Array(MATRIX_SIZE).fill(POPULATION_STATES.HEALTHY)
    );
    
    drawMatrix();
    
    // Event listeners
    const startSimBtn = document.getElementById('start-simulation-btn');
    const designVaccineBtn = document.getElementById('design-vaccine-btn');
    const deployVaccineBtn = document.getElementById('deploy-vaccine-btn');
    
    if (startSimBtn) {
        startSimBtn.addEventListener('click', startPandemicSimulation);
    }
    
    if (designVaccineBtn) {
        designVaccineBtn.addEventListener('click', designVaccine);
    }
    
    if (deployVaccineBtn) {
        deployVaccineBtn.addEventListener('click', deployVaccine);
    }
}

// Draw population matrix
function drawMatrix() {
    if (!matrixCtx || !pandemicMatrix) return;
    
    matrixCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    
    for (let i = 0; i < MATRIX_SIZE; i++) {
        for (let j = 0; j < MATRIX_SIZE; j++) {
            const state = pandemicMatrix[i][j];
            const color = STATE_COLORS[state] || '#00ff88';
            
            matrixCtx.fillStyle = color;
            matrixCtx.fillRect(j * CELL_SIZE, i * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
            
            // Add glow effect
            if (state !== POPULATION_STATES.HEALTHY) {
                matrixCtx.shadowBlur = 5;
                matrixCtx.shadowColor = color;
                matrixCtx.fillRect(j * CELL_SIZE, i * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
                matrixCtx.shadowBlur = 0;
            }
        }
    }
}

// Simulate virus spread
function simulateSpread(iterations = 50) {
    let currentIteration = 0;
    
    const spreadInterval = setInterval(() => {
        const newMatrix = pandemicMatrix.map(row => [...row]);
        let infectedCount = 0;
        let severeCount = 0;
        let fatalCount = 0;
        let recoveredCount = 0;
        
        for (let i = 0; i < MATRIX_SIZE; i++) {
            for (let j = 0; j < MATRIX_SIZE; j++) {
                const state = pandemicMatrix[i][j];
                
                // Spread infection
                if (state === POPULATION_STATES.HEALTHY) {
                    let hasInfectedNeighbor = false;
                    for (let di = -1; di <= 1; di++) {
                        for (let dj = -1; dj <= 1; dj++) {
                            if (di === 0 && dj === 0) continue;
                            const ni = i + di;
                            const nj = j + dj;
                            if (ni >= 0 && ni < MATRIX_SIZE && nj >= 0 && nj < MATRIX_SIZE) {
                                if (pandemicMatrix[ni][nj] === POPULATION_STATES.INFECTED ||
                                    pandemicMatrix[ni][nj] === POPULATION_STATES.SEVERE) {
                                    hasInfectedNeighbor = true;
                                    break;
                                }
                            }
                        }
                        if (hasInfectedNeighbor) break;
                    }
                    if (hasInfectedNeighbor && Math.random() < 0.15) {
                        newMatrix[i][j] = POPULATION_STATES.INFECTED;
                    }
                }
                
                // Progression: infected -> severe -> fatal or recovered
                if (state === POPULATION_STATES.INFECTED) {
                    if (Math.random() < 0.1) {
                        newMatrix[i][j] = POPULATION_STATES.SEVERE;
                    } else if (Math.random() < 0.05) {
                        newMatrix[i][j] = POPULATION_STATES.RECOVERED;
                    }
                } else if (state === POPULATION_STATES.SEVERE) {
                    if (Math.random() < 0.08) {
                        newMatrix[i][j] = POPULATION_STATES.FATAL;
                    } else if (Math.random() < 0.12) {
                        newMatrix[i][j] = POPULATION_STATES.RECOVERED;
                    }
                }
            }
        }
        
        pandemicMatrix = newMatrix;
        drawMatrix();
        
        // Count states
        for (let i = 0; i < MATRIX_SIZE; i++) {
            for (let j = 0; j < MATRIX_SIZE; j++) {
                const s = pandemicMatrix[i][j];
                if (s === POPULATION_STATES.INFECTED) infectedCount++;
                else if (s === POPULATION_STATES.SEVERE) severeCount++;
                else if (s === POPULATION_STATES.FATAL) fatalCount++;
                else if (s === POPULATION_STATES.RECOVERED) recoveredCount++;
            }
        }
        
        currentIteration++;
        if (currentIteration >= iterations) {
            clearInterval(spreadInterval);
            isSimulating = false;
        }
    }, 100);
}

// Start pandemic simulation
async function startPandemicSimulation() {
    if (isSimulating) return;
    
    isSimulating = true;
    const startBtn = document.getElementById('start-simulation-btn');
    const thinkingContainer = document.getElementById('pandemic-thinking-logs');
    const resultsContainer = document.getElementById('pandemic-results');
    
    // Reset matrix
    pandemicMatrix = Array(MATRIX_SIZE).fill(null).map(() => 
        Array(MATRIX_SIZE).fill(POPULATION_STATES.HEALTHY)
    );
    
    // Start with some infected individuals
    const initialInfected = 3;
    for (let i = 0; i < initialInfected; i++) {
        const x = Math.floor(Math.random() * MATRIX_SIZE);
        const y = Math.floor(Math.random() * MATRIX_SIZE);
        pandemicMatrix[x][y] = POPULATION_STATES.INFECTED;
    }
    
    drawMatrix();
    
    // Show loading state on button
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.classList.add('loading');
    }
    
    // Clear previous results
    if (thinkingContainer) thinkingContainer.innerHTML = '';
    if (resultsContainer) resultsContainer.innerHTML = '';
    
    let loadingDotsInterval = null;
    let messageRotationInterval = null;
    let timerInterval = null;
    let timerSeconds = 0;
    
    // Loading messages similar to mutation predictor
    const loadingMessages = [
        'Initializing population matrix',
        'Setting up simulation parameters',
        'Seeding initial infections',
        'Calculating transmission rates',
        'Analyzing mutation patterns',
        'Evaluating disease severity',
        'Computing mortality statistics',
        'Processing epidemiological data',
        'Generating simulation results',
        'Compiling statistics'
    ];
    
    try {
        // Add timer to thinking container
        let timerElement = null;
        if (thinkingContainer) {
            timerElement = document.createElement('div');
            timerElement.className = 'ai-timer';
            timerElement.textContent = '00:00';
            thinkingContainer.appendChild(timerElement);
            
            // Start timer
            timerSeconds = 0;
            timerInterval = setInterval(() => {
                timerSeconds++;
                const minutes = Math.floor(timerSeconds / 60);
                const seconds = timerSeconds % 60;
                if (timerElement) {
                    timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                }
            }, 1000);
        }
        
        // Show initial loading message with animated dots
        let currentMessageIndex = 0;
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'thinking-log loading';
        
        const updateLoadingMessage = () => {
            loadingDiv.innerHTML = `>>> ${loadingMessages[currentMessageIndex]}<span class="loading-dots"></span>`;
        };
        
        updateLoadingMessage();
        if (thinkingContainer) {
            thinkingContainer.appendChild(loadingDiv);
        }
        
        // Animate loading dots
        let dotCount = 0;
        loadingDotsInterval = setInterval(() => {
            dotCount = (dotCount % 3) + 1;
            const dotsElement = loadingDiv.querySelector('.loading-dots');
            if (dotsElement) {
                dotsElement.textContent = '.'.repeat(dotCount);
            }
        }, 500);
        
        // Rotate messages every 2.5 seconds
        messageRotationInterval = setInterval(() => {
            currentMessageIndex = (currentMessageIndex + 1) % loadingMessages.length;
            updateLoadingMessage();
        }, 2500);
        
        // Generate pandemic simulation data via AI
        const aiResponse = await generatePandemicSimulation();
        
        // Stop all animations and timers
        if (loadingDotsInterval) {
            clearInterval(loadingDotsInterval);
            loadingDotsInterval = null;
        }
        if (messageRotationInterval) {
            clearInterval(messageRotationInterval);
            messageRotationInterval = null;
        }
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        if (timerElement && timerElement.parentNode) {
            timerElement.parentNode.removeChild(timerElement);
        }
        
        // Clear loading message
        if (thinkingContainer) {
            thinkingContainer.innerHTML = '';
        }
        
        // Show thinking process
        if (thinkingContainer && aiResponse.logs) {
            await showThinkingProcess(thinkingContainer, aiResponse.logs);
        }
        
        // Show analysis
        if (resultsContainer && aiResponse.analysis) {
            showPandemicAnalysis(resultsContainer, aiResponse.analysis);
        }
        
        // Animate virus spread
        simulateSpread(80);
        
        // Store pandemic data for vaccine design
        pandemicData = aiResponse.analysis;
        
        // Enable vaccine design button
        const designVaccineBtn = document.getElementById('design-vaccine-btn');
        if (designVaccineBtn) {
            designVaccineBtn.disabled = false;
        }
        const vaccineStatus = document.getElementById('vaccine-status');
        if (vaccineStatus) {
            vaccineStatus.querySelector('.status-text').textContent = 'آماده برای طراحی واکسن';
        }
        
    } catch (error) {
        console.error('Error in pandemic simulation:', error);
        alert('خطا در شبیه‌سازی: ' + error.message);
        
        // Stop animations on error
        if (loadingDotsInterval) {
            clearInterval(loadingDotsInterval);
        }
        if (messageRotationInterval) {
            clearInterval(messageRotationInterval);
        }
        if (timerInterval) {
            clearInterval(timerInterval);
        }
    } finally {
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.classList.remove('loading');
        }
        isSimulating = false;
    }
}

// Generate pandemic simulation via AI
async function generatePandemicSimulation() {
    const prompt = `You are an advanced AI virologist simulating a pandemic for DEMONSTRATION PURPOSE.
Generate REALISTIC-LOOKING but RANDOM/FICTIONAL data only.

CRITICAL: Keep explanations SHORT. Focus on DATA (tables, charts) and LOGS. Avoid long paragraphs.

SECTION 1 - INITIAL LOGS (10-15 messages):
Start with "===LOGS_START==="
Generate 10-15 short, technical log messages in English (max 60 chars each).
Examples: "Initializing population matrix...", "Seeding initial infections...", "Calculating transmission rates..."
End with "===LOGS_END==="

SECTION 2 - DATA ANALYSIS (Persian, Markdown):
Start with "===ANALYSIS_START==="

FIRST: Provide a detailed explanation of the pandemic situation. This should be a comprehensive text description (3-4 paragraphs) explaining:
- Current pandemic status
- Virus characteristics and behavior
- Population impact
- Overall health situation
- Transmission patterns
This text will be displayed in the text results section.

THEN: After the pandemic explanation, provide the following data structures:

1. ## جدول آمار (MANDATORY - Must include ONE table)
   | شاخص | مقدار | درصد |
   |-------|-------|------|
   | نرخ عفونت کل | XXXX | XX% |
   | موارد خفیف | XXXX | XX% |
   | موارد متوسط | XXXX | XX% |
   | موارد شدید | XXXX | XX% |
   | موارد کشنده | XXXX | XX% |
   | نرخ بهبود | XXXX | XX% |
   | نرخ مرگ و میر | XXXX | XX% |
   
   Include at least 7 rows with SPECIFIC NUMBERS.

2. ## نمودارهای داده (MANDATORY - Must include 3 charts with MARKERS)
   IMPORTANT: Do NOT create actual charts. Only MARK them with special notation.
   The website will detect these markers and create animated charts automatically.
   
   You must provide THREE charts in these EXACT formats:
   
   a) PIE CHART for infection distribution:
      [CHART_PIE:توزیع افراد:آلوده,XX|بیمار,XX|سالم,XX|بهبود یافته,XX]
   
   b) SCATTER PLOT for virus replication status:
      [CHART_SCATTER:وضعیت تکثیر ویروس:روز1,XX|روز2,XX|روز3,XX|روز4,XX|روز5,XX]
   
   c) BAR CHART for virus characteristics:
      [CHART_BAR:ویژگی‌های ویروس:سرعت تکثیر,XX|مقاومت,XX|عفونت‌زایی,XX|پایداری,XX]
   
   Rules:
   - Chart titles must be in Persian
   - Labels must be in Persian
   - Values should be numbers (0-100 for percentages, or appropriate ranges)
   - Each chart should have 4-6 data points
   - Place chart markers at the END of the relevant section
   - Each chart marker must be on a SEPARATE line

3. ## جهش‌های ژنتیکی
   - Bullet list ONLY (4-6 items):
     - **نام جهش**: توضیح کوتاه (یک جمله)
     - **نام جهش**: توضیح کوتاه
   
   NO long explanations - just mutation names and one-sentence effects.

IMPORTANT RULES:
- Start with pandemic explanation text (3-4 paragraphs)
- Include ONE table with specific numbers (mandatory)
- Include THREE chart markers (pie, scatter, bar) - DO NOT create charts, only mark them
- Generate RANDOM but REALISTIC numbers
- Use exact markers for all sections
- Make each simulation UNIQUE
- Text style should match mutation prediction section (detailed and scientific)

End with "===ANALYSIS_END==="`;

    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        
        try {
            const errorData = JSON.parse(errorText);
            if (errorData.error && errorData.error.message) {
                errorMessage += ` - ${errorData.error.message}`;
            }
        } catch (e) {
            errorMessage += ` - ${errorText.substring(0, 200)}`;
        }
        
        throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('No response from AI model');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Extract logs section
    const logsStart = generatedText.indexOf('===LOGS_START===');
    const logsEnd = generatedText.indexOf('===LOGS_END===');
    
    // Extract analysis section
    const analysisStart = generatedText.indexOf('===ANALYSIS_START===');
    const analysisEnd = generatedText.indexOf('===ANALYSIS_END===');
    
    let logs = [];
    let analysis = null;
    
    // Parse logs
    if (logsStart !== -1 && logsEnd !== -1) {
        const logsText = generatedText.substring(logsStart + '===LOGS_START==='.length, logsEnd).trim();
        logs = logsText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    }
    
    // Parse analysis
    if (analysisStart !== -1 && analysisEnd !== -1) {
        const analysisText = generatedText.substring(analysisStart + '===ANALYSIS_START==='.length, analysisEnd).trim();
        const charts = extractPandemicChartData(analysisText);
        analysis = {
            text: analysisText,
            charts: charts
        };
                } else {
        analysis = { text: generatedText, charts: [] };
    }
    
    return { logs, analysis };
}

// Display pandemic analysis
function showPandemicAnalysis(container, analysis) {
    // Parse and display main analysis (tables, charts, brief text)
    const parsedHTML = parseMarkdownToHTML(analysis.text);
    
    container.innerHTML = `
        <div class="pandemic-results-content">
            ${parsedHTML}
        </div>
    `;
    
    // Generate charts if available
    if (analysis.charts && analysis.charts.length > 0) {
        setTimeout(() => {
            createPandemicCharts(analysis.charts);
        }, 500);
    }
}

// Show summary logs in Persian (DEPRECATED - will be removed)
function showSummaryLogs(container, logs) {
    // This function is kept for backwards compatibility but should not be called
    return Promise.resolve();
}

// Design vaccine
async function designVaccine() {
    if (isDesigningVaccine || !pandemicData) return;
    
    isDesigningVaccine = true;
    const designBtn = document.getElementById('design-vaccine-btn');
    const vaccineStatus = document.getElementById('vaccine-status');
    const thinkingContainer = document.getElementById('vaccine-thinking-logs');
    const resultsContainer = document.getElementById('vaccine-results');
    
    if (designBtn) designBtn.disabled = true;
    if (vaccineStatus) vaccineStatus.querySelector('.status-text').textContent = 'در حال طراحی واکسن...';
    
    // Clear previous results
    if (thinkingContainer) thinkingContainer.innerHTML = '';
    if (resultsContainer) resultsContainer.innerHTML = '';
    
    try {
        // Generate vaccine design via AI
        const aiResponse = await generateVaccineDesign(pandemicData);
        
        // Show thinking process
        if (thinkingContainer && aiResponse.logs) {
            await showThinkingProcess(thinkingContainer, aiResponse.logs);
        }
        
        // Show vaccine design
        if (resultsContainer && aiResponse.analysis) {
            showVaccineDesign(resultsContainer, aiResponse.analysis);
                }
        
        // Store vaccine data
        vaccineData = aiResponse.analysis;
        
        // Enable deployment button
        const deployBtn = document.getElementById('deploy-vaccine-btn');
        if (deployBtn) {
            deployBtn.disabled = false;
        }
        const deployStatus = document.getElementById('deployment-status');
        if (deployStatus) {
            deployStatus.querySelector('.status-text').textContent = 'آماده برای توزیع واکسن';
        }
        
        if (vaccineStatus) vaccineStatus.querySelector('.status-text').textContent = 'واکسن طراحی شد';
        
            } catch (error) {
        console.error('Error in vaccine design:', error);
        if (vaccineStatus) vaccineStatus.querySelector('.status-text').textContent = 'خطا در طراحی واکسن';
        alert('خطا در طراحی واکسن: ' + error.message);
    } finally {
        if (designBtn) designBtn.disabled = false;
        isDesigningVaccine = false;
    }
}

// Generate vaccine design via AI
async function generateVaccineDesign(pandemicData) {
    const prompt = `You are an advanced AI virologist and vaccine designer creating a recombinant vaccine for DEMONSTRATION PURPOSE.
IMPORTANT: Generate REALISTIC-LOOKING but RANDOM/FICTIONAL vaccine design. This is for display/demonstration only.

PANDEMIC DATA (for reference - use this to inform vaccine design):
${pandemicData ? pandemicData.text.substring(0, 500) : 'No previous pandemic data available'}

TASK: Design a recombinant vaccine based on the pandemic characteristics.

SECTION 1 - LOGS (10-15 log messages):
Start with "===LOGS_START==="
Generate 10-15 short, technical log messages in English showing vaccine design process.
Examples: "Analyzing viral antigens...", "Selecting target proteins...", "Designing recombinant construct...", "Optimizing expression vector...", "Evaluating immunogenicity...", "Simulating vaccine efficacy..."
Focus on vaccine development, molecular biology, and immunology steps.
End with "===LOGS_END==="

SECTION 2 - VACCINE DESIGN (in Persian/Farsi with Markdown formatting):
Start with "===ANALYSIS_START==="
Generate a comprehensive vaccine design report in Persian using Markdown format.

CRITICAL REQUIREMENTS:
1. Design should be based on pandemic characteristics
2. Make design UNIQUE and VARIED
3. Include SPECIFIC NUMBERS and TECHNICAL DETAILS

The design MUST include:

1. # طراحی واکسن نوترکیب
   - Overview of vaccine type and approach
   - 2-3 sentences

2. ## ترکیبات واکسن
   - List vaccine components (fictional but realistic)
   - Include: antigen proteins, adjuvants, stabilizers
   - 4-6 bullet points

3. ## مکانیسم عملکرد
   - How the vaccine works
   - Immune response mechanism
   - 3-4 paragraphs

4. ## کارایی پیش‌بینی شده
   - Efficacy rate: XX% (random 70-95%)
   - Protection against different disease severities
   - Duration of protection
   - Include SPECIFIC NUMBERS

5. ## عوارض جانبی احتمالی
   - Common side effects
   - Rare side effects
   - Safety profile
   - Use bullet list

6. ## جدول مشخصات واکسن (CRITICAL - Must include ONE table)
   | ویژگی | مقدار |
   |-------|-------|
   | نوع واکسن | نوترکیب |
   | کارایی | XX% |
   | دوز | X mg |
   | تعداد دوز | X |
   | فاصله بین دوزها | X هفته |
   | مدت زمان محافظت | X ماه |
   
   Include at least 6-7 rows.

7. ## نمودار (CRITICAL - Must include 1 chart)
   [CHART:کارایی واکسن:پیشگیری از عفونت,XX|پیشگیری از بیماری شدید,XX|پیشگیری از مرگ,XX|کاهش انتقال,XX]
   Generate 1 chart with 4-5 data points (values 70-100).

8. ## توصیه‌های توزیع
   - Priority groups for vaccination
   - Distribution strategy
   - Use numbered list (1. 2. 3. 4. 5.)

Format as clear, scientific Markdown text in Persian.
End with "===ANALYSIS_END==="`;

    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('No response from AI model');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Extract logs and analysis
    const logsStart = generatedText.indexOf('===LOGS_START===');
    const logsEnd = generatedText.indexOf('===LOGS_END===');
    const analysisStart = generatedText.indexOf('===ANALYSIS_START===');
    const analysisEnd = generatedText.indexOf('===ANALYSIS_END===');
    
    let logs = [];
    let analysis = null;
    
    if (logsStart !== -1 && logsEnd !== -1) {
        const logsText = generatedText.substring(logsStart + '===LOGS_START==='.length, logsEnd).trim();
        logs = logsText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    }
    
    if (analysisStart !== -1 && analysisEnd !== -1) {
        const analysisText = generatedText.substring(analysisStart + '===ANALYSIS_START==='.length, analysisEnd).trim();
        const charts = extractChartData(analysisText);
        analysis = {
            text: analysisText,
            charts: charts
        };
    } else {
        analysis = { text: generatedText, charts: [] };
    }
    
    return { logs, analysis };
}

// Display vaccine design
function showVaccineDesign(container, analysis) {
    const parsedHTML = parseMarkdownToHTML(analysis.text);
    
    container.innerHTML = `
        <div class="vaccine-results-content">
            ${parsedHTML}
        </div>
    `;
    
    // Generate charts if available
    if (analysis.charts && analysis.charts.length > 0) {
                    setTimeout(() => {
            createVaccineCharts(analysis.charts);
        }, 500);
    }
}

// Deploy vaccine
async function deployVaccine() {
    if (!vaccineData) return;
    
    const deployBtn = document.getElementById('deploy-vaccine-btn');
    const deployStatus = document.getElementById('deployment-status');
    const resultsContainer = document.getElementById('post-vaccine-results');
    
    if (deployBtn) deployBtn.disabled = true;
    if (deployStatus) deployStatus.querySelector('.status-text').textContent = 'در حال توزیع واکسن...';
    
    // Vaccinate random portion of population
    const vaccinationRate = 0.6; // 60% vaccination
    let vaccinated = 0;
    
    for (let i = 0; i < MATRIX_SIZE; i++) {
        for (let j = 0; j < MATRIX_SIZE; j++) {
            if (pandemicMatrix[i][j] === POPULATION_STATES.HEALTHY && Math.random() < vaccinationRate) {
                pandemicMatrix[i][j] = POPULATION_STATES.VACCINATED;
                vaccinated++;
            } else if ((pandemicMatrix[i][j] === POPULATION_STATES.INFECTED || 
                       pandemicMatrix[i][j] === POPULATION_STATES.SEVERE) && 
                       Math.random() < 0.3) {
                // Some infected recover due to treatment
                pandemicMatrix[i][j] = POPULATION_STATES.RECOVERED;
            }
        }
    }
    
    drawMatrix();
    
    // Generate post-vaccination analysis
    try {
        const aiResponse = await generatePostVaccinationAnalysis(pandemicData, vaccineData);
        
        if (resultsContainer && aiResponse.analysis) {
            showPostVaccinationResults(resultsContainer, aiResponse.analysis);
        }
        
        if (deployStatus) deployStatus.querySelector('.status-text').textContent = 'واکسن توزیع شد';
        
    } catch (error) {
        console.error('Error in post-vaccination analysis:', error);
        if (resultsContainer) {
            resultsContainer.innerHTML = '<p style="color: #ff0000;">خطا در تحلیل نتایج واکسیناسیون</p>';
        }
    } finally {
        if (deployBtn) deployBtn.disabled = false;
    }
}

// Generate post-vaccination analysis
async function generatePostVaccinationAnalysis(pandemicData, vaccineData) {
    const prompt = `You are an advanced AI epidemiologist analyzing post-vaccination outcomes for DEMONSTRATION PURPOSE.
IMPORTANT: Generate REALISTIC-LOOKING but RANDOM/FICTIONAL analysis. This is for display/demonstration only.

PANDEMIC DATA:
${pandemicData ? pandemicData.text.substring(0, 400) : ''}

VACCINE DATA:
${vaccineData ? vaccineData.text.substring(0, 400) : ''}

TASK: Analyze the impact of vaccination on the population.

Start with "===ANALYSIS_START==="
Generate analysis in Persian using Markdown format.

Include:

1. # نتایج واکسیناسیون
   - Overview of vaccination campaign
   - Coverage rate: XX% (random 50-70%)
   - 2-3 sentences

2. ## تأثیر بر نرخ عفونت
   - Reduction in infection rate
   - Before: XX%, After: XX%
   - Percentage reduction
   - Include SPECIFIC NUMBERS

3. ## تأثیر بر مرگ و میر
   - Reduction in mortality
   - Before: XX%, After: XX%
   - Lives saved
   - Include SPECIFIC NUMBERS

4. ## پیشگیری از بیماری شدید
   - Reduction in severe cases
   - Hospitalization rate changes
   - Include SPECIFIC NUMBERS

5. ## جدول مقایسه قبل و بعد (CRITICAL - Must include ONE table)
   | شاخص | قبل از واکسن | بعد از واکسن | تغییر |
   |------|-------------|-------------|-------|
   | نرخ عفونت | XX% | XX% | -XX% |
   | موارد شدید | XX% | XX% | -XX% |
   | نرخ مرگ | XX% | XX% | -XX% |
   | نرخ بهبود | XX% | XX% | +XX% |
   
   Include at least 5-6 rows with realistic data.

6. ## نمودار (CRITICAL - Must include 1 chart)
   [CHART:مقایسه قبل و بعد از واکسن:نرخ عفونت قبل,XX|نرخ عفونت بعد,XX|مرگ و میر قبل,XX|مرگ و میر بعد,XX]
   Generate 1 chart with 4 data points comparing before/after.

7. ## نتیجه‌گیری
   - Overall assessment
   - Success metrics
   - Remaining challenges
   - 2-3 paragraphs

Format as clear Markdown text in Persian.
End with "===ANALYSIS_END==="`;

    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        })
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('No response from AI model');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    
    const analysisStart = generatedText.indexOf('===ANALYSIS_START===');
    const analysisEnd = generatedText.indexOf('===ANALYSIS_END===');
    
    let analysis = null;
    
    if (analysisStart !== -1 && analysisEnd !== -1) {
        const analysisText = generatedText.substring(analysisStart + '===ANALYSIS_START==='.length, analysisEnd).trim();
        const charts = extractChartData(analysisText);
        analysis = {
            text: analysisText,
            charts: charts
        };
    } else {
        analysis = { text: generatedText, charts: [] };
    }
    
    return { analysis };
}

// Display post-vaccination results
function showPostVaccinationResults(container, analysis) {
    const parsedHTML = parseMarkdownToHTML(analysis.text);
    
    container.innerHTML = `
        <div class="post-vaccine-results-content">
            ${parsedHTML}
        </div>
    `;
    
    // Generate charts if available
    if (analysis.charts && analysis.charts.length > 0) {
        setTimeout(() => {
            createPostVaccineCharts(analysis.charts);
        }, 500);
    }
}

// Create charts for pandemic analysis
function createPandemicCharts(charts) {
    const chartsContainer = document.getElementById('pandemic-charts-container');
    if (!chartsContainer) return;
    
    chartsContainer.innerHTML = '';
    
    charts.forEach((chart, index) => {
        const chartType = chart.type || 'bar';
        
        if (chartType === 'pie') {
            createPieChartChartJS(chartsContainer, chart, index);
        } else if (chartType === 'bar') {
            createBarChartChartJS(chartsContainer, chart, index);
        } else {
            const chartWrapper = document.createElement('div');
            chartWrapper.className = 'pandemic-chart-wrapper';
            
            const chartTitle = document.createElement('h4');
            chartTitle.textContent = chart.title;
            chartWrapper.appendChild(chartTitle);
            
            const chartCanvas = document.createElement('canvas');
            chartCanvas.id = `pandemic-chart-${index}`;
            chartCanvas.className = 'pandemic-chart-canvas';
            chartWrapper.appendChild(chartCanvas);
            
            chartsContainer.appendChild(chartWrapper);
            
            setTimeout(() => {
                if (chartType === 'scatter') {
                    drawScatterChart(`pandemic-chart-${index}`, chart.data);
                } else {
                    drawBarChart(`pandemic-chart-${index}`, chart.data);
                }
            }, 100);
        }
    });
}

// Create charts for vaccine design
function createVaccineCharts(charts) {
    const container = document.getElementById('vaccine-results');
    if (!container) return;
    
    charts.forEach((chart, index) => {
        const chartSection = document.createElement('div');
        chartSection.className = 'chart-section';
        chartSection.innerHTML = `<h4>${chart.title}</h4><canvas id="vaccine-chart-${index}"></canvas>`;
        container.appendChild(chartSection);
        
        setTimeout(() => {
            drawChart(`vaccine-chart-${index}`, chart.title, chart.data);
        }, 100);
    });
}

// Create charts for post-vaccination
function createPostVaccineCharts(charts) {
    const container = document.getElementById('post-vaccine-results');
    if (!container) return;
    
    charts.forEach((chart, index) => {
        const chartSection = document.createElement('div');
        chartSection.className = 'chart-section';
        chartSection.innerHTML = `<h4>${chart.title}</h4><canvas id="post-vaccine-chart-${index}"></canvas>`;
        container.appendChild(chartSection);
        
        setTimeout(() => {
            drawChart(`post-vaccine-chart-${index}`, chart.title, chart.data);
        }, 100);
    });
}

// Draw bar chart (for backward compatibility)
function drawChart(canvasId, title, data) {
    drawBarChart(canvasId, data);
}

// Draw bar chart
function drawBarChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || 600;
    canvas.height = 300;
    
    const maxValue = Math.max(...data.map(d => d.value), 100);
    const barWidth = (canvas.width - 100) / data.length;
    const barSpacing = 10;
    const startX = 50;
    const startY = 20;
    const chartHeight = canvas.height - 60;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bars with animation
    data.forEach((item, index) => {
        setTimeout(() => {
            const barHeight = (item.value / maxValue) * chartHeight;
            const x = startX + index * (barWidth + barSpacing);
            const y = startY + chartHeight - barHeight;
            
            // Gradient
            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            gradient.addColorStop(0, '#00ffff');
            gradient.addColorStop(1, '#00ff88');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth - barSpacing, barHeight);
            
            // Value label
            ctx.fillStyle = '#e0f7ff';
            ctx.font = 'bold 12px Vazirmatn';
            ctx.textAlign = 'center';
            ctx.fillText(item.value + '%', x + (barWidth - barSpacing) / 2, y - 5);
            
            // Label
            ctx.fillStyle = '#b8e6f0';
            ctx.font = '11px Vazirmatn';
            ctx.save();
            ctx.translate(x + (barWidth - barSpacing) / 2, canvas.height - 10);
            ctx.rotate(-Math.PI / 6);
            ctx.fillText(item.label, 0, 0);
            ctx.restore();
        }, index * 100);
    });
}

// Create pie chart using Chart.js (matching the provided example format)
function createPieChartChartJS(container, chart, index) {
    // Colors matching the example
    const colorPalette = [
        '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#06b6d4', 
        '#ef4444', '#10b981', '#6366f1', '#f97316', '#8b5cf6'
    ];
    
    const borderColors = [
        '#a78bfa', '#f472b6', '#2dd4bf', '#fbbf24', '#22d3ee',
        '#f87171', '#34d399', '#818cf8', '#fb923c', '#a78bfa'
    ];
    
    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'pandemic-chart-wrapper pie-chart-wrapper';
    
    const chartContainer = document.createElement('div');
    chartContainer.className = 'pie-chart-container';
    chartContainer.style.position = 'relative';
    chartContainer.style.height = '400px';
    chartContainer.style.marginBottom = '0';
    
    const chartCanvas = document.createElement('canvas');
    chartCanvas.id = `pandemic-pie-chart-${index}`;
    chartCanvas.className = 'pandemic-chart-canvas';
    chartContainer.appendChild(chartCanvas);
    chartWrapper.appendChild(chartContainer);
    
    container.appendChild(chartWrapper);
    
    // Initialize Chart.js pie chart
    setTimeout(() => {
        const ctx = chartCanvas.getContext('2d');
        
        const chartData = {
            labels: chart.data.map(item => item.label),
            datasets: [{
                data: chart.data.map(item => item.value),
                backgroundColor: chart.data.map((_, idx) => colorPalette[idx % colorPalette.length]),
                borderColor: chart.data.map((_, idx) => borderColors[idx % borderColors.length]),
                borderWidth: 2,
                hoverOffset: 15
            }]
        };
        
        const config = {
            type: 'pie',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed + '%';
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 2000,
                    easing: 'easeInOutQuart'
                }
            }
        };
        
        const pieChart = new Chart(ctx, config);
        
        // Add click event
        chartCanvas.addEventListener('click', (evt) => {
            const points = pieChart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (points.length) {
                const firstPoint = points[0];
                const label = pieChart.data.labels[firstPoint.index];
                const value = pieChart.data.datasets[firstPoint.datasetIndex].data[firstPoint.index];
                console.log('کلیک شد:', label, '-', value + '%');
            }
        });
    }, 100);
}

// Create bar chart using Chart.js (matching the provided example format)
function createBarChartChartJS(container, chart, index) {
    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'pandemic-chart-wrapper bar-chart-wrapper';
    
    const chartTitle = document.createElement('h4');
    chartTitle.textContent = chart.title;
    chartTitle.style.textAlign = 'center';
    chartTitle.style.marginBottom = '20px';
    chartWrapper.appendChild(chartTitle);
    
    const chartContainer = document.createElement('div');
    chartContainer.className = 'bar-chart-container';
    chartContainer.style.position = 'relative';
    chartContainer.style.height = '450px';
    chartContainer.style.marginBottom = '35px';
    chartContainer.style.padding = '20px';
    chartContainer.style.background = 'rgba(255, 255, 255, 0.02)';
    chartContainer.style.borderRadius = '15px';
    chartContainer.style.border = '1px solid rgba(255, 255, 255, 0.05)';
    
    const chartCanvas = document.createElement('canvas');
    chartCanvas.id = `pandemic-bar-chart-${index}`;
    chartCanvas.className = 'pandemic-chart-canvas';
    chartContainer.appendChild(chartCanvas);
    chartWrapper.appendChild(chartContainer);
    
    container.appendChild(chartWrapper);
    
    // Initialize Chart.js bar chart
    setTimeout(() => {
        const ctx = chartCanvas.getContext('2d');
        
        const chartData = {
            labels: chart.data.map(item => item.label),
            datasets: [{
                label: '',
                data: chart.data.map(item => item.value),
                backgroundColor: function(context) {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) return 'rgba(102, 126, 234, 0.8)';
                    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
                    gradient.addColorStop(0.5, 'rgba(118, 75, 162, 0.8)');
                    gradient.addColorStop(1, 'rgba(240, 147, 251, 0.8)');
                    return gradient;
                },
                borderColor: function(context) {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) return 'rgba(102, 126, 234, 1)';
                    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    gradient.addColorStop(0, 'rgba(102, 126, 234, 1)');
                    gradient.addColorStop(1, 'rgba(240, 147, 251, 1)');
                    return gradient;
                },
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
                barPercentage: 0.7,
                categoryPercentage: 0.8
            }]
        };
        
        const config = {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#ffffff',
                            padding: 20,
                            font: {
                                size: 14,
                                weight: '600',
                                family: 'Vazirmatn, sans-serif'
                            },
                            usePointStyle: true,
                            pointStyle: 'rectRounded'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#cbd5e0',
                        borderColor: 'rgba(102, 126, 234, 0.5)',
                        borderWidth: 2,
                        padding: 15,
                        displayColors: true,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                return ' مقدار: ' + context.parsed.y;
                            },
                            afterLabel: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0;
                                return 'سهم: ' + percentage + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.08)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#cbd5e0',
                            font: {
                                size: 12,
                                family: 'Vazirmatn, sans-serif'
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#cbd5e0',
                            font: {
                                size: 12,
                                family: 'Vazirmatn, sans-serif'
                            }
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart',
                    onComplete: function() {
                        const chart = this;
                        const ctx = chart.ctx;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 11px Vazirmatn';
                        
                        this.data.datasets.forEach(function(dataset, i) {
                            const meta = chart.getDatasetMeta(i);
                            meta.data.forEach(function(bar, index) {
                                const data = dataset.data[index];
                                ctx.fillText(data, bar.x, bar.y - 5);
                            });
                        });
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        };
        
        const barChart = new Chart(ctx, config);
        
        // Hover effects
        chartCanvas.addEventListener('mousemove', (e) => {
            const activePoints = barChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
            if (activePoints.length > 0) {
                chartCanvas.style.cursor = 'pointer';
            } else {
                chartCanvas.style.cursor = 'default';
            }
        });
        
        chartCanvas.addEventListener('click', (evt) => {
            const points = barChart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (points.length) {
                const firstPoint = points[0];
                const label = barChart.data.labels[firstPoint.index];
                const value = barChart.data.datasets[firstPoint.datasetIndex].data[firstPoint.index];
                console.log('کلیک شد:', label, '-', value);
            }
        });
    }, 100);
}

// Draw scatter plot
function drawScatterChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || 600;
    canvas.height = 300;
    
    const padding = 60;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const maxValue = Math.max(...data.map(d => d.value), 100);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw axes
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Draw grid
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }
    
    // Draw scatter points with animation
    data.forEach((item, index) => {
        setTimeout(() => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = canvas.height - padding - (item.value / maxValue) * chartHeight;
            
            // Draw point
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#00ffff';
            ctx.fill();
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Label
            ctx.fillStyle = '#b8e6f0';
            ctx.font = '10px Vazirmatn';
            ctx.textAlign = 'center';
            ctx.fillText(item.label, x, canvas.height - padding + 20);
            
            // Value
            ctx.fillStyle = '#e0f7ff';
            ctx.font = 'bold 9px Vazirmatn';
            ctx.fillText(item.value, x, y - 10);
        }, index * 100);
    });
}

// ==================== NEW PANDEMIC SIMULATION ====================
let pandemicCanvas = null;
let pandemicCtx = null;
let pandemicParticles = [];
let pandemicAnimationId = null;
let pandemicIsRunning = false;
let pandemicAnimationActive = false; // Flag to control animation continuation after simulation ends
let pandemicFrameCount = 0;
let pandemicSpeed = 1;
let pandemicInfectionRadius = 30;
let pandemicInfectionRate = 0.25;
let pandemicInfectionDuration = 200;
let pandemicMortalityRate = 0.05;
let pandemicVaccinationRate = 0;
let pandemicChart = null;
let pandemicChartMini = null;
let pandemicChartMiniSecondary = null;
let isSecondarySimulation = false;
let stage1Data = null;
let stage2Data = null;
let pandemicMaxFrames = 3000;
let pandemicSimulationData = [];
let pandemicCurrentParams = null;
let pandemicVirusCharacteristics = null;
let pandemicStage = 1; // 1 = virus spread, 2 = vaccine development, 3 = vaccine distribution
let pandemicStage1Complete = false;
let liveLogsContainer = null;
let lastLogTime = 0;

const PANDEMIC_STATUS = {
    HEALTHY: 0,
    INFECTED: 1,
    SICK: 2,
    RECOVERED: 3,
    VACCINATED: 4,
    DEAD: 5
};

const PANDEMIC_COLORS = {
    [PANDEMIC_STATUS.HEALTHY]: { r: 0, g: 255, b: 136, hex: '#00ff88' },
    [PANDEMIC_STATUS.INFECTED]: { r: 255, g: 0, b: 85, hex: '#ff0055' },
    [PANDEMIC_STATUS.SICK]: { r: 255, g: 136, b: 0, hex: '#ff8800' },
    [PANDEMIC_STATUS.RECOVERED]: { r: 0, g: 170, b: 255, hex: '#00aaff' },
    [PANDEMIC_STATUS.VACCINATED]: { r: 168, g: 85, b: 247, hex: '#a855f7' },
    [PANDEMIC_STATUS.DEAD]: { r: 255, g: 217, b: 0, hex: '#ffd900' }
};

class PandemicParticle {
    constructor(x, y, status = PANDEMIC_STATUS.HEALTHY) {
        this.x = x;
        this.y = y;
        this.status = status;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.infectionTime = 0;
        this.trail = [];
        this.glowPhase = Math.random() * Math.PI * 2;
        this.size = 4;
    }

    update() {
        if (this.status === PANDEMIC_STATUS.DEAD) {
            this.vx *= 0.95;
            this.vy *= 0.95;
            this.size *= 0.99;
            return;
        }

        this.x += this.vx * pandemicSpeed;
        this.y += this.vy * pandemicSpeed;

        if (this.x < 0 || this.x > pandemicCanvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > pandemicCanvas.height) this.vy *= -1;

        this.x = Math.max(0, Math.min(pandemicCanvas.width, this.x));
        this.y = Math.max(0, Math.min(pandemicCanvas.height, this.y));

        if (this.status === PANDEMIC_STATUS.INFECTED || this.status === PANDEMIC_STATUS.SICK) {
            this.trail.push({ x: this.x, y: this.y, alpha: 1 });
            if (this.trail.length > 15) this.trail.shift();
            
            this.trail.forEach(t => t.alpha *= 0.92);
        }

        this.glowPhase += 0.1;

        if (this.status === PANDEMIC_STATUS.INFECTED || this.status === PANDEMIC_STATUS.SICK) {
            this.infectionTime++;
            
            if (this.status === PANDEMIC_STATUS.INFECTED && this.infectionTime > pandemicInfectionDuration * 0.4) {
                if (Math.random() < pandemicMortalityRate * 0.5) {
                    this.status = PANDEMIC_STATUS.DEAD;
                    this.size = 3;
                } else {
                    this.status = PANDEMIC_STATUS.SICK;
                }
            }

            if (this.status === PANDEMIC_STATUS.SICK && this.infectionTime > pandemicInfectionDuration) {
                if (Math.random() < pandemicMortalityRate) {
                    this.status = PANDEMIC_STATUS.DEAD;
                    this.size = 3;
                } else {
                    this.status = PANDEMIC_STATUS.RECOVERED;
                    this.trail = [];
                }
            }
        }
    }

    draw() {
        const color = PANDEMIC_COLORS[this.status];
        
        // Simplified trail - only show last 3 points
        const trailToShow = this.trail.slice(-3);
        trailToShow.forEach((t, i) => {
            const alpha = t.alpha * 0.2;
            const size = this.size * 0.5;
            pandemicCtx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
            pandemicCtx.beginPath();
            pandemicCtx.arc(t.x, t.y, size, 0, Math.PI * 2);
            pandemicCtx.fill();
        });

        // Simplified glow for infected/sick - smaller and simpler
        if (this.status === PANDEMIC_STATUS.INFECTED || this.status === PANDEMIC_STATUS.SICK) {
            const glowSize = this.size + 4;
            pandemicCtx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`;
            pandemicCtx.beginPath();
            pandemicCtx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
            pandemicCtx.fill();
        }

        // Simple solid circle - no complex gradients
        pandemicCtx.fillStyle = color.hex;
        pandemicCtx.beginPath();
        pandemicCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        pandemicCtx.fill();
        
        // Small highlight dot
        pandemicCtx.fillStyle = `rgba(255, 255, 255, 0.5)`;
        pandemicCtx.beginPath();
        pandemicCtx.arc(this.x - this.size * 0.3, this.y - this.size * 0.3, this.size * 0.3, 0, Math.PI * 2);
        pandemicCtx.fill();
    }
}

function resizePandemicCanvases() {
    if (!pandemicCanvas) return;
    const width = pandemicCanvas.offsetWidth;
    const height = width * 0.75;
    
    pandemicCanvas.width = width;
    pandemicCanvas.height = height;
}

function initPandemicParticles() {
    pandemicParticles = [];
    const numParticles = 300;
    
    for (let i = 0; i < numParticles; i++) {
        const x = Math.random() * pandemicCanvas.width;
        const y = Math.random() * pandemicCanvas.height;
        pandemicParticles.push(new PandemicParticle(x, y, PANDEMIC_STATUS.HEALTHY));
    }

    for (let i = 0; i < 5; i++) {
        const p = pandemicParticles[Math.floor(Math.random() * pandemicParticles.length)];
        if (p.status === PANDEMIC_STATUS.HEALTHY) {
            p.status = PANDEMIC_STATUS.INFECTED;
        }
    }
}

function drawPandemicConnections() {
    pandemicParticles.forEach(p1 => {
        if (p1.status !== PANDEMIC_STATUS.INFECTED && p1.status !== PANDEMIC_STATUS.SICK) return;
        
        pandemicParticles.forEach(p2 => {
            if (p1 === p2) return;
            if (p2.status === PANDEMIC_STATUS.DEAD || p2.status === PANDEMIC_STATUS.RECOVERED) return;
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < pandemicInfectionRadius) {
                const alpha = (1 - dist / pandemicInfectionRadius) * 0.3;
                const color = PANDEMIC_COLORS[p1.status];
                pandemicCtx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
                pandemicCtx.lineWidth = 1.5;
                pandemicCtx.beginPath();
                pandemicCtx.moveTo(p1.x, p1.y);
                pandemicCtx.lineTo(p2.x, p2.y);
                pandemicCtx.stroke();
            }
        });
    });
}

function checkPandemicInfections() {
    // Vaccinate healthy individuals in stage 3 or secondary simulation (gradually increase vaccination rate)
    if ((pandemicStage === 3 || isSecondarySimulation) && pandemicVaccinationRate > 0) {
        // Gradually increase vaccination rate over time
        const vaccinationProgress = Math.min(pandemicFrameCount / (pandemicMaxFrames * 0.3), 1);
        const currentVaccinationRate = pandemicVaccinationRate * (0.5 + vaccinationProgress * 0.5);
        
        pandemicParticles.forEach(p => {
            if (p.status === PANDEMIC_STATUS.HEALTHY && Math.random() < currentVaccinationRate * 0.01) {
                p.status = PANDEMIC_STATUS.VACCINATED;
            }
        });
    }
    
    pandemicParticles.forEach(p1 => {
        if (p1.status !== PANDEMIC_STATUS.INFECTED && p1.status !== PANDEMIC_STATUS.SICK) return;
        
        pandemicParticles.forEach(p2 => {
            // Vaccinated individuals have much lower infection rate
            if (p2.status === PANDEMIC_STATUS.VACCINATED) {
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < pandemicInfectionRadius && Math.random() < pandemicInfectionRate * 0.1) {
                    // Very low chance for vaccinated to get infected
                    p2.status = PANDEMIC_STATUS.INFECTED;
                    p2.infectionTime = 0;
                }
                return;
            }
            
            if (p2.status !== PANDEMIC_STATUS.HEALTHY) return;
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < pandemicInfectionRadius && Math.random() < pandemicInfectionRate) {
                p2.status = PANDEMIC_STATUS.INFECTED;
                p2.infectionTime = 0;
            }
        });
    });
}

function generateVirusCharacteristics() {
    const mutationRates = ['کم', 'متوسط', 'زیاد', 'بسیار زیاد'];
    const resistanceLevels = ['حساس', 'متوسط', 'مقاوم', 'بسیار مقاوم'];
    const epitopeStatuses = ['در حال بازسازی', 'بازسازی شده', 'بهینه‌سازی شده', 'آماده تولید'];
    const chargeLevels = ['کم', 'متوسط', 'زیاد', 'بسیار زیاد'];
    
    // Generate binding energy (ΔG) in kcal/mol (typically ranges from -5 to -15 for strong binding)
    const bindingEnergy = (Math.random() * 10 - 15).toFixed(2);
    
    // Generate charge redistribution value (percentage change)
    const chargeRedistribution = (Math.random() * 30 + 10).toFixed(1);
    
    return {
        mutationRate: mutationRates[Math.floor(Math.random() * mutationRates.length)],
        resistanceLevel: resistanceLevels[Math.floor(Math.random() * resistanceLevels.length)],
        bindingEnergy: bindingEnergy, // ΔG in kcal/mol
        epitopeReconstruction: epitopeStatuses[Math.floor(Math.random() * epitopeStatuses.length)],
        chargeRedistribution: chargeRedistribution, // Percentage change
        rnaSequence: generateRandomRNA(150),
        spikeProtein: {
            bindingAffinity: (Math.random() * 0.5 + 0.3).toFixed(3),
            stability: (Math.random() * 0.4 + 0.4).toFixed(3)
        }
    };
}

function generateRandomRNA(length) {
    const bases = ['A', 'U', 'G', 'C'];
    let sequence = '';
    for (let i = 0; i < length; i++) {
        sequence += bases[Math.floor(Math.random() * 4)];
    }
    return sequence;
}

function generateRandomParams() {
    return {
        infectionRadius: (Math.random() * 2 + 0.5).toFixed(1),
        infectionRate: Math.floor(Math.random() * 40) + 15,
        infectionDuration: Math.floor(Math.random() * 14) + 7,
        mortalityRate: (Math.random() * 0.15 + 0.02).toFixed(3)
    };
}

// Generate improved parameters for secondary simulation (with vaccine)
function generateSecondaryParams(baseParams) {
    return {
        infectionRadius: (parseFloat(baseParams.infectionRadius) * 0.6).toFixed(1), // 40% reduction
        infectionRate: Math.max(5, Math.floor(baseParams.infectionRate * 0.4)), // 60% reduction (minimum 5%)
        infectionDuration: Math.max(3, Math.floor(baseParams.infectionDuration * 0.4)), // 60% reduction (faster recovery, minimum 3 days)
        mortalityRate: (parseFloat(baseParams.mortalityRate) * 0.2).toFixed(3) // 80% reduction
    };
}

function displayParams(params, virusChars) {
    const paramsDisplay = document.getElementById('simulationParamsDisplay');
    if (!paramsDisplay) return;
    
    let html = '';
    
    if (virusChars) {
        html += `
            <div class="param-item">
                <span class="param-label">مقاومت:</span>
                <span class="param-value">${virusChars.resistanceLevel}</span>
            </div>
            <div class="param-item">
                <span class="param-label">ΔG (انرژی اتصال):</span>
                <span class="param-value">${virusChars.bindingEnergy} kcal/mol</span>
            </div>
            <div class="param-item">
                <span class="param-label">بازسازی اپی‌توپ:</span>
                <span class="param-value">${virusChars.epitopeReconstruction}</span>
            </div>
            <div class="param-item">
                <span class="param-label">توزیع مجدد بار:</span>
                <span class="param-value">${virusChars.chargeRedistribution}%</span>
            </div>
        `;
    }
    
    html += `
        <div class="param-item">
            <span class="param-label">شعاع:</span>
            <span class="param-value">${params.infectionRadius}m</span>
        </div>
        <div class="param-item">
            <span class="param-label">مدت:</span>
            <span class="param-value">${params.infectionDuration}روز</span>
        </div>
        <div class="param-item">
            <span class="param-label">مرگ:</span>
            <span class="param-value">${(params.mortalityRate * 100).toFixed(1)}%</span>
        </div>
    `;
    
    paramsDisplay.innerHTML = html;
}

function updatePandemicStats() {
    const stats = {
        [PANDEMIC_STATUS.HEALTHY]: 0,
        [PANDEMIC_STATUS.INFECTED]: 0,
        [PANDEMIC_STATUS.SICK]: 0,
        [PANDEMIC_STATUS.RECOVERED]: 0,
        [PANDEMIC_STATUS.VACCINATED]: 0,
        [PANDEMIC_STATUS.DEAD]: 0
    };
    
    pandemicParticles.forEach(p => stats[p.status]++);
    
    if (pandemicFrameCount % 10 === 0) {
        updatePandemicChart(stats);
        updatePandemicChartMini(stats);
        pandemicSimulationData.push({
            frame: pandemicFrameCount,
            stats: { ...stats }
        });
    }
    
    // Add live logs every 30 frames (about every 0.5 seconds at 60fps)
    if (pandemicFrameCount % 30 === 0) {
        addLiveLog(stats);
    }
    
    const totalActive = stats[PANDEMIC_STATUS.INFECTED] + stats[PANDEMIC_STATUS.SICK];
    
    if (pandemicStage === 1) {
        // Stage 1 ends when infection peaks and starts declining
        if (pandemicFrameCount >= pandemicMaxFrames * 0.6 || (totalActive === 0 && pandemicFrameCount > 500)) {
            endPandemicSimulation();
        }
    } else if (pandemicStage === 3) {
        // Stage 3 ends after vaccine distribution period
        if (pandemicFrameCount >= pandemicMaxFrames || (totalActive === 0 && pandemicFrameCount > pandemicMaxFrames * 0.8)) {
            endPandemicSimulation();
        }
    } else if (isSecondarySimulation) {
        // Secondary simulation ends
        if (pandemicFrameCount >= pandemicMaxFrames * 0.6 || (totalActive === 0 && pandemicFrameCount > 500)) {
            endPandemicSimulation();
        }
    }
}

function addLiveLog(stats) {
    if (!liveLogsContainer) {
        liveLogsContainer = document.getElementById('simulationLiveLogs');
        if (!liveLogsContainer) return;
    }
    
    const total = pandemicParticles.length;
    const time = Math.floor(pandemicFrameCount / 60);
    const infected = stats[PANDEMIC_STATUS.INFECTED] + stats[PANDEMIC_STATUS.SICK];
    const recovered = stats[PANDEMIC_STATUS.RECOVERED];
    const dead = stats[PANDEMIC_STATUS.DEAD];
    const vaccinated = stats[PANDEMIC_STATUS.VACCINATED];
    
    const messages = [
        `[${time}s] Infected: ${infected} | Recovered: ${recovered} | Dead: ${dead}`,
        `[${time}s] Active cases: ${infected} | Total recovered: ${recovered}`,
        `[${time}s] Death toll: ${dead} | Recovery rate: ${((recovered / total) * 100).toFixed(1)}%`,
        `[${time}s] Vaccinated: ${vaccinated} | Protected: ${((vaccinated / total) * 100).toFixed(1)}%`,
        `[${time}s] Infection spread: ${infected} cases | Mortality: ${((dead / total) * 100).toFixed(1)}%`
    ];
    
    // Randomly select a message or create a specific one
    let message;
    if (pandemicStage === 3 && vaccinated > 0) {
        message = `[${time}s] Vaccine distribution: ${vaccinated} vaccinated | Active: ${infected}`;
    } else if (recovered > 0) {
        message = `[${time}s] Recovery update: ${recovered} recovered | ${infected} still infected`;
    } else if (dead > 0) {
        message = `[${time}s] Fatalities: ${dead} deaths | ${infected} active cases`;
    } else {
        message = messages[Math.floor(Math.random() * messages.length)];
    }
    
    const logEntry = document.createElement('div');
    logEntry.className = 'simulation-live-log typewriter';
    logEntry.textContent = message;
    liveLogsContainer.appendChild(logEntry);
    
    // Typewriter effect
    const text = message;
    logEntry.textContent = '';
    let charIndex = 0;
    
    const typeInterval = setInterval(() => {
        if (charIndex < text.length) {
            logEntry.textContent += text[charIndex];
            charIndex++;
            liveLogsContainer.scrollTop = liveLogsContainer.scrollHeight;
        } else {
            clearInterval(typeInterval);
            logEntry.classList.add('completed');
            
            // Remove old logs (keep only last 15)
            const logs = liveLogsContainer.querySelectorAll('.simulation-live-log');
            if (logs.length > 15) {
                logs[0].remove();
            }
        }
    }, 10);
}

function endPandemicSimulation() {
    if (pandemicStage === 1 && !pandemicStage1Complete) {
        // Stage 1 complete - stop simulation logic but keep animation running
        pandemicIsRunning = false;
        pandemicStage1Complete = true;
        
        const startBtn = document.getElementById('startSimBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = '▶ شروع شبیه‌سازی';
        }
        
        // Show vaccine button
        const vaccineBtn = document.getElementById('vaccineBtn');
        if (vaccineBtn) {
            vaccineBtn.style.display = 'inline-block';
        }
        
        // Keep animation running for visual effect
        pandemicAnimationActive = true;
        if (!pandemicAnimationId) {
            pandemicAnimate();
        }
    } else if (isSecondarySimulation) {
        // Secondary simulation complete - stop simulation logic but keep animation running
        pandemicIsRunning = false;
        pandemicAnimationActive = true;
        if (!pandemicAnimationId) {
            pandemicAnimate();
        }
        
        // Save stage 2 data
        stage2Data = {
            stats: getStage1Statistics(),
            chartData: pandemicChartMiniSecondary ? JSON.parse(JSON.stringify(pandemicChartMiniSecondary.data)) : null
        };
        
        const startBtn = document.getElementById('startSimBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = '▶ شروع شبیه‌سازی';
        }
        
        // Generate or update comparison report with real data
        // If report was already generated in background, it will be updated
        // Otherwise, generate it now with real stage2Data
        generateComparisonReport();
    } else if (pandemicStage === 3) {
        // Stage 3 complete - stop simulation logic but keep animation running
        pandemicIsRunning = false;
        pandemicAnimationActive = true;
        if (!pandemicAnimationId) {
            pandemicAnimate();
        }
        
        const startBtn = document.getElementById('startSimBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = '▶ شروع شبیه‌سازی';
        }
        
        generateAIReport();
    }
}

async function startVaccineDevelopment() {
    // Check if stage 1 is complete
    if (!pandemicStage1Complete) {
        alert('لطفاً ابتدا شبیه‌سازی ویروس را کامل کنید');
        return;
    }
    
    const vaccineBtn = document.getElementById('vaccineBtn');
    if (vaccineBtn) {
        vaccineBtn.disabled = true;
        vaccineBtn.textContent = 'در حال طراحی...';
    }
    
    // Get stage 1 statistics
    const stage1Stats = getStage1Statistics();
    
    // Generate vaccine development logs
    const logs = generateVaccineLogs(stage1Stats);
    
    // Display logs with typewriter effect in live logs container
    for (let i = 0; i < logs.length; i++) {
        await addVaccineLog(logs[i], i * 300);
    }
    
    // After logs complete, start vaccine distribution
    setTimeout(() => {
        startVaccineDistribution();
        if (vaccineBtn) {
            vaccineBtn.disabled = false;
            vaccineBtn.textContent = '💉 طراحی واکسن';
        }
    }, logs.length * 300 + 1000);
}

function generateVaccineLogs(stage1Stats) {
    const logs = [
        'Analyzing virus genetic sequence...',
        'Identifying spike protein structure...',
        'Mapping antigen binding sites...',
        'Calculating optimal vaccine formula...',
        'Designing mRNA sequence template...',
        'Simulating immune response...',
        'Validating vaccine efficacy...',
        'Preparing production protocols...',
        'Initializing bioreactor systems...',
        'Synthesizing vaccine components...',
        'Purifying vaccine solution...',
        'Quality control testing...',
        'Packaging vaccine doses...',
        'Vaccine production complete!'
    ];
    return logs;
}

async function addVaccineLog(message, delay) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Add to live logs container instead of vaccine-thinking-logs
            if (!liveLogsContainer) {
                liveLogsContainer = document.getElementById('simulationLiveLogs');
            }
            if (!liveLogsContainer) {
                resolve();
                return;
            }
            
            const logEntry = document.createElement('div');
            logEntry.className = 'simulation-live-log typewriter';
            logEntry.textContent = message;
            liveLogsContainer.appendChild(logEntry);
            liveLogsContainer.scrollTop = liveLogsContainer.scrollHeight;
            
            // Typewriter effect
            const text = message;
            logEntry.textContent = '';
            let charIndex = 0;
            
            const typeInterval = setInterval(() => {
                if (charIndex < text.length) {
                    logEntry.textContent += text[charIndex];
                    charIndex++;
                    liveLogsContainer.scrollTop = liveLogsContainer.scrollHeight;
                } else {
                    clearInterval(typeInterval);
                    logEntry.classList.add('completed');
                    resolve();
                }
            }, 30);
        }, delay);
    });
}

function getStage1Statistics() {
    const finalStats = {
        [PANDEMIC_STATUS.HEALTHY]: 0,
        [PANDEMIC_STATUS.INFECTED]: 0,
        [PANDEMIC_STATUS.SICK]: 0,
        [PANDEMIC_STATUS.RECOVERED]: 0,
        [PANDEMIC_STATUS.VACCINATED]: 0,
        [PANDEMIC_STATUS.DEAD]: 0
    };
    
    pandemicParticles.forEach(p => finalStats[p.status]++);
    
    const total = pandemicParticles.length;
    let peakInfected = 0;
    if (pandemicSimulationData && pandemicSimulationData.length > 0) {
        peakInfected = Math.max(...pandemicSimulationData.map(d => (d.stats[PANDEMIC_STATUS.INFECTED] || 0) + (d.stats[PANDEMIC_STATUS.SICK] || 0)));
    } else {
        peakInfected = finalStats[PANDEMIC_STATUS.INFECTED] + finalStats[PANDEMIC_STATUS.SICK];
    }
    const totalDeaths = finalStats[PANDEMIC_STATUS.DEAD];
    const totalRecovered = finalStats[PANDEMIC_STATUS.RECOVERED];
    
    return {
        total,
        peakInfected,
        totalDeaths,
        totalRecovered,
        finalStats
    };
}

function startVaccineDistribution() {
    // Save stage 1 data
    stage1Data = {
        stats: getStage1Statistics(),
        chartData: pandemicChartMini ? JSON.parse(JSON.stringify(pandemicChartMini.data)) : null
    };
    
    // Start secondary simulation with vaccine
    isSecondarySimulation = true;
    startSecondarySimulation();
}

function startSecondarySimulation() {
    // Stop previous animation completely
    pandemicIsRunning = false;
    pandemicAnimationActive = false;
    if (pandemicAnimationId) {
        cancelAnimationFrame(pandemicAnimationId);
        pandemicAnimationId = null;
    }
    
    // Initialize secondary chart
    if (!pandemicChartMiniSecondary) {
        const chartCanvasSecondary = document.getElementById('pandemic-chart-canvas-mini-secondary');
        if (chartCanvasSecondary && typeof Chart !== 'undefined') {
            const chartCtxSecondary = chartCanvasSecondary.getContext('2d');
            const chartDataSecondary = createChartData();
            pandemicChartMiniSecondary = new Chart(chartCtxSecondary, {
                type: 'line',
                data: chartDataSecondary,
                options: createChartOptions(1.5, true)
            });
        }
    } else {
        pandemicChartMiniSecondary.data.labels = [];
        pandemicChartMiniSecondary.data.datasets.forEach(dataset => dataset.data = []);
        pandemicChartMiniSecondary.update();
    }
    
    // Reset simulation data for secondary simulation
    pandemicSimulationData = [];
    
    // Generate improved parameters for secondary simulation (with vaccine)
    const secondaryParams = generateSecondaryParams(pandemicCurrentParams);
    
    // Apply improved parameters (vaccine effects)
    pandemicFrameCount = 0;
    pandemicVaccinationRate = 0.4; // Higher vaccination rate (40%)
    pandemicInfectionRadius = parseFloat(secondaryParams.infectionRadius) * 20;
    pandemicInfectionRate = secondaryParams.infectionRate / 100; // Significantly reduced infection rate (60% reduction)
    pandemicInfectionDuration = secondaryParams.infectionDuration * 60; // Faster recovery (60% reduction - much faster)
    pandemicMortalityRate = parseFloat(secondaryParams.mortalityRate); // Significantly reduced mortality (80% reduction)
    
    // Display secondary simulation parameters
    displayParams(secondaryParams, pandemicVirusCharacteristics);
    
    // Reset particles
    initPandemicParticles();
    updatePandemicStats();
    
    // Start generating comparison report in the background while simulation runs
    // This allows the AI to work during simulation time
    if (stage1Data) {
        // Create a mock stage2Data with predicted values based on stage1
        const predictedStage2Data = {
            stats: {
                finalStats: {
                    [PANDEMIC_STATUS.DEAD]: Math.floor(stage1Data.stats.finalStats[PANDEMIC_STATUS.DEAD] * 0.3), // Predicted 70% reduction
                    [PANDEMIC_STATUS.RECOVERED]: Math.floor(stage1Data.stats.finalStats[PANDEMIC_STATUS.RECOVERED] * 1.15), // Predicted 15% increase
                    [PANDEMIC_STATUS.INFECTED]: 0,
                    [PANDEMIC_STATUS.SICK]: 0,
                    [PANDEMIC_STATUS.HEALTHY]: 0,
                    [PANDEMIC_STATUS.VACCINATED]: 0
                },
                peakInfected: Math.floor(stage1Data.stats.peakInfected * 0.97), // Predicted 3% reduction
                total: stage1Data.stats.total
            }
        };
        
        // Start generating report in background (non-blocking)
        comparisonReportPromise = generateAIComparisonReport(stage1Data, predictedStage2Data).catch(error => {
            console.error('Error generating comparison report in background:', error);
            return null;
        });
    }
    
    // Wait a bit to ensure previous animation is fully stopped, then start new animation
    setTimeout(() => {
        // Start animation
        pandemicIsRunning = true;
        pandemicAnimationActive = true;
        pandemicAnimate();
    }, 50);
}

async function generateAIReport() {
    const resultsContainer = document.getElementById('simulationResultsContainer');
    const resultsContent = document.getElementById('simulationResultsContent');
    
    if (!resultsContainer || !resultsContent) return;
    
    const stage1Stats = getStage1Statistics();
    const stage3Stats = getStage3Statistics();
    
    try {
        const report = await generateAIVaccineReport(stage1Stats, stage3Stats);
        
        // Display report with markdown formatting
        resultsContent.innerHTML = report;
        resultsContainer.style.display = 'block';
        setTimeout(() => {
            resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    } catch (error) {
        console.error('Error generating AI report:', error);
        resultsContent.innerHTML = '<p style="color: #ff6b6b;">خطا در تولید گزارش: ' + error.message + '</p>';
        resultsContainer.style.display = 'block';
    }
}

function getStage3Statistics() {
    const finalStats = {
        [PANDEMIC_STATUS.HEALTHY]: 0,
        [PANDEMIC_STATUS.INFECTED]: 0,
        [PANDEMIC_STATUS.SICK]: 0,
        [PANDEMIC_STATUS.RECOVERED]: 0,
        [PANDEMIC_STATUS.VACCINATED]: 0,
        [PANDEMIC_STATUS.DEAD]: 0
    };
    
    pandemicParticles.forEach(p => finalStats[p.status]++);
    
    return {
        finalStats,
        vaccinated: finalStats[PANDEMIC_STATUS.VACCINATED]
    };
}

async function generateComparisonReport() {
    const comparisonContainer = document.getElementById('simulationComparisonContainer');
    const comparisonContent = document.getElementById('simulationComparisonContent');
    const comparisonLoading = document.getElementById('comparisonLoading');
    
    if (!comparisonContainer || !comparisonContent || !stage1Data) return;
    
    // Show container and loading
    comparisonContainer.style.display = 'block';
    if (comparisonLoading) {
        comparisonLoading.style.display = 'block';
    }
    comparisonContent.innerHTML = '';
    
    // If stage2Data is not ready yet, wait for it or use predicted data
    if (!stage2Data && !comparisonReportPromise) {
        // No data available yet, hide loading and return
        if (comparisonLoading) {
            comparisonLoading.style.display = 'none';
        }
        comparisonContainer.style.display = 'none';
        return;
    }
    
    try {
        // If report is already being generated with predicted data, wait for it first
        // Then regenerate with real data if stage2Data is available
        if (comparisonReportPromise && !stage2Data) {
            const report = await comparisonReportPromise;
            // Hide loading
            if (comparisonLoading) {
                comparisonLoading.style.display = 'none';
            }
            // Parse markdown and display
            const parsedHTML = parseMarkdownToHTML(report);
            comparisonContent.innerHTML = `<div class="ai-analysis-text">${parsedHTML}</div>`;
            setTimeout(() => {
                comparisonContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
            // Clear the promise so we can regenerate with real data later
            comparisonReportPromise = null;
            return;
        }
        
        // Generate report using AI with real stage2Data (or predicted if not available)
        const reportData = stage2Data || {
            stats: {
                finalStats: {
                    [PANDEMIC_STATUS.DEAD]: Math.floor(stage1Data.stats.finalStats[PANDEMIC_STATUS.DEAD] * 0.3),
                    [PANDEMIC_STATUS.RECOVERED]: Math.floor(stage1Data.stats.finalStats[PANDEMIC_STATUS.RECOVERED] * 1.15),
                    [PANDEMIC_STATUS.INFECTED]: 0,
                    [PANDEMIC_STATUS.SICK]: 0,
                    [PANDEMIC_STATUS.HEALTHY]: 0,
                    [PANDEMIC_STATUS.VACCINATED]: 0
                },
                peakInfected: Math.floor(stage1Data.stats.peakInfected * 0.97),
                total: stage1Data.stats.total
            }
        };
        
        const report = await generateAIComparisonReport(stage1Data, reportData);
        
        // Hide loading
        if (comparisonLoading) {
            comparisonLoading.style.display = 'none';
        }
        
        // Parse markdown and display with same styling as mutation prediction
        const parsedHTML = parseMarkdownToHTML(report);
        comparisonContent.innerHTML = `<div class="ai-analysis-text">${parsedHTML}</div>`;
        
        setTimeout(() => {
            comparisonContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        
        // Clear the promise
        comparisonReportPromise = null;
    } catch (error) {
        console.error('Error generating comparison report:', error);
        // Hide loading
        if (comparisonLoading) {
            comparisonLoading.style.display = 'none';
        }
        comparisonContent.innerHTML = '<p style="color: #ff6b6b;">خطا در تولید گزارش: ' + error.message + '</p>';
        comparisonReportPromise = null;
    }
}

// Variable to store the comparison report promise
let comparisonReportPromise = null;

async function generateAIComparisonReport(stage1Data, stage2Data) {
    const s1 = stage1Data.stats;
    const s2 = stage2Data.stats;
    
    const s1Deaths = s1.finalStats[PANDEMIC_STATUS.DEAD] || 0;
    const s2Deaths = s2.finalStats[PANDEMIC_STATUS.DEAD] || 0;
    const s1Recovered = s1.finalStats[PANDEMIC_STATUS.RECOVERED] || 0;
    const s2Recovered = s2.finalStats[PANDEMIC_STATUS.RECOVERED] || 0;
    const s1PeakInfected = s1.peakInfected || 0;
    const s2PeakInfected = s2.peakInfected || 0;
    
    const deathReduction = s1Deaths > 0 ? ((s1Deaths - s2Deaths) / s1Deaths * 100).toFixed(1) : '0';
    const recoveryIncrease = s1Recovered > 0 ? ((s2Recovered - s1Recovered) / s1Recovered * 100).toFixed(1) : '0';
    const peakReduction = s1PeakInfected > 0 ? ((s1PeakInfected - s2PeakInfected) / s1PeakInfected * 100).toFixed(1) : '0';
    
    const prompt = `You are an advanced AI virologist and epidemiologist analyzing a pandemic simulation comparison for DEMONSTRATION PURPOSE. Generate REALISTIC-LOOKING but RANDOM/FICTIONAL data only.

SIMULATION COMPARISON DATA:
Before Vaccine (Stage 1):
- Total Deaths: ${s1Deaths} people
- Total Recovered: ${s1Recovered} people
- Peak Infected: ${s1PeakInfected} people
- Virus Characteristics: ${pandemicVirusCharacteristics.mutationRate}, ${pandemicVirusCharacteristics.resistanceLevel}
- Binding Energy (ΔG): ${pandemicVirusCharacteristics.bindingEnergy} kcal/mol
- Epitope Reconstruction: ${pandemicVirusCharacteristics.epitopeReconstruction}
- Charge Redistribution: ${pandemicVirusCharacteristics.chargeRedistribution}%

After Vaccine (Stage 2):
- Total Deaths: ${s2Deaths} people
- Total Recovered: ${s2Recovered} people
- Peak Infected: ${s2PeakInfected} people

Calculated Metrics:
- Death Reduction: ${deathReduction}%
- Recovery Increase: ${recoveryIncrease}%
- Peak Infection Reduction: ${peakReduction}%

TASK: Generate a comprehensive comparison report in Persian using Markdown format (NOT HTML).

IMPORTANT: Make the output beautiful and visually clear by:
- Using proper header hierarchy (# for main title, ## for sections, ### for subsections)
- Highlighting ALL important words, scientific terms, and numbers with **bold**
- Using clear titles and headers that stand out
- Making tables well-formatted with proper alignment
- Using proper spacing between sections
- Making sure every key concept, number, and term is highlighted

Start with "===REPORT_START==="

Generate a detailed report with these EXACT sections using Markdown syntax:

1. ## 📊 خلاصه آماری
   
   Create a comprehensive statistical summary table in Markdown format:
   
   | شاخص | قبل از واکسن | بعد از واکسن | تغییر |
   |------|-------------|-------------|-------|
   | تعداد فوت‌شدگان | ${s1Deaths} نفر | ${s2Deaths} نفر | ${deathReduction}% کاهش |
   | تعداد بهبودیافتگان | ${s1Recovered} نفر | ${s2Recovered} نفر | ${recoveryIncrease}% افزایش |
   | اوج آلودگی | ${s1PeakInfected} نفر | ${s2PeakInfected} نفر | ${peakReduction}% کاهش |
   
   Then add 2-3 paragraphs explaining these statistics in detail.

2. ## 🤖 تحلیل هوش مصنوعی
   
   Write detailed analysis (4-5 paragraphs) covering:
   - Impact of vaccine on mortality reduction (${deathReduction}%)
   - Impact on recovery rates (${recoveryIncrease}% increase)
   - Impact on infection spread control (${peakReduction}% reduction)
   - Herd immunity effects
   - Scientific explanation of how the AI-designed vaccine works based on:
     * Epitope reconstruction under glycosylation layer (${pandemicVirusCharacteristics.epitopeReconstruction})
     * Binding energy analysis (ΔG = ${pandemicVirusCharacteristics.bindingEnergy} kcal/mol)
     * Charge redistribution modeling (${pandemicVirusCharacteristics.chargeRedistribution}%)
     * Protein-antibody interaction mapping
   - Molecular mechanisms behind vaccine effectiveness
   - How the AI molecular model contributed to vaccine design

3. ## 💡 نتیجه‌گیری
   
   Write comprehensive conclusion (2-3 paragraphs) covering:
   - Overall assessment of vaccine effectiveness
   - Key findings from the comparison
   - Implications for future vaccine development
   - Role of AI in adaptive vaccine design

FORMATTING REQUIREMENTS - CRITICAL FOR BEAUTIFUL OUTPUT:
- Use Markdown format (NOT HTML)
- **HEADERS HIERARCHY** - Use proper header levels for clear structure:
  * Use # for main title (h1) - only once at the beginning
  * Use ## for major section headers (h2) - for main sections
  * Use ### for subsection headers (h3) - for subsections
  * Use #### for sub-subsections (h4) - for detailed points
- **HIGHLIGHTING IMPORTANT WORDS**:
  * Use **bold** (**text**) for important scientific terms, key concepts, and critical numbers
  * Use code formatting (backticks) for technical terms, formulas, and specific values
  * Use ***bold italic*** for extremely important concepts
  * Highlight all scientific terminology, percentages, and key metrics
- **TABLES** - Use proper Markdown table syntax with alignment:
  * Use | for columns
  * Use :---: for center alignment, ---: for right, :--- for left
  * Make tables clean and well-spaced
- **LISTS**:
  * Use - or * for bullet lists
  * Use numbered lists (1. 2. 3.) for ordered lists
  * Use nested lists with proper indentation (2 spaces)
- **EMPHASIS**:
  * Use **bold** for key terms, numbers, and important concepts
  * Use *italic* for emphasis on specific points
  * Use > blockquotes for important notes or highlights
- **STRUCTURE**:
  * Start with a clear main title using # (h1)
  * Use ## for each major section
  * Use ### for subsections within major sections
  * Add clear spacing between sections (blank lines)
- **NUMBERS AND DATA**:
  * Always highlight percentages and numbers with **bold**
  * Use specific numbers from the simulation data provided
  * Format numbers clearly (e.g., **${deathReduction}%** not just ${deathReduction}%)
- Write in a highly technical, scientific, and professional tone
- Use proper Persian scientific terminology
- Format exactly like the mutation prediction analysis section with beautiful markdown

QUALITY REQUIREMENTS:
- The report must be detailed, professional, and complete
- All scientific terms must be discussed in depth and **highlighted with bold**
- Use specific numbers from the simulation data provided and **make them bold**
- Make it sound like a real scientific research report
- Include detailed explanation of molecular mechanisms
- The markdown should be clean, well-formatted, and visually appealing
- **Every important word, title, header, and number should be properly formatted for maximum clarity**

End with "===REPORT_END==="`;

    try {
        const response = await fetch(getGeminiApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('No response from AI model');
        }

        const generatedText = data.candidates[0].content.parts[0].text;
        
        // Extract report section
        const reportStart = generatedText.indexOf('===REPORT_START===');
        const reportEnd = generatedText.indexOf('===REPORT_END===');
        
        if (reportStart === -1 || reportEnd === -1) {
            throw new Error('Invalid report format');
        }
        
        let report = generatedText.substring(reportStart + '===REPORT_START==='.length, reportEnd).trim();
        
        // Return markdown text (will be parsed by parseMarkdownToHTML)
        return report;
    } catch (error) {
        console.error('Error generating AI comparison report:', error);
        throw error;
    }
}

async function generateAIVaccineReport(stage1Stats, stage3Stats) {
    
    const prompt = `You are an advanced AI molecular biologist and virologist specializing in adaptive vaccine design and computational immunology. You are analyzing a pandemic simulation for DEMONSTRATION PURPOSE. Generate REALISTIC-LOOKING but RANDOM/FICTIONAL data only.

SIMULATION DATA:
Stage 1 (Virus Spread):
- Total Population: ${stage1Stats.total}
- Peak Infected: ${stage1Stats.peakInfected}
- Total Deaths: ${stage1Stats.totalDeaths}
- Total Recovered: ${stage1Stats.totalRecovered}
- Virus Characteristics: ${pandemicVirusCharacteristics.mutationRate}, ${pandemicVirusCharacteristics.resistanceLevel}
- Binding Energy (ΔG): ${pandemicVirusCharacteristics.bindingEnergy} kcal/mol
- Epitope Reconstruction: ${pandemicVirusCharacteristics.epitopeReconstruction}
- Charge Redistribution: ${pandemicVirusCharacteristics.chargeRedistribution}%

Stage 3 (After Vaccine):
- Vaccinated: ${stage3Stats.vaccinated}
- Final Healthy: ${stage3Stats.finalStats[PANDEMIC_STATUS.HEALTHY]}
- Final Infected: ${stage3Stats.finalStats[PANDEMIC_STATUS.INFECTED]}

CRITICAL REQUIREMENTS - YOU MUST INCLUDE ALL OF THESE:

1. MANDATORY SCIENTIFIC TERMS - You MUST discuss in detail:
   - **اپی‌توپ زیر لایهٔ گلیکوزیلاسیون** (Epitope under glycosylation layer): Explain how the AI molecular model reconstructed the 3D structure of the epitope beneath the glycosylation layer. Describe the challenges of modeling this hidden epitope and how the AI overcame them.
   - **تغییرات در انرژی اتصال (ΔG)** (Changes in binding energy ΔG): Provide detailed analysis of the binding energy changes (ΔG = ${pandemicVirusCharacteristics.bindingEnergy} kcal/mol). Explain what this value means for antibody-antigen binding affinity, how it was calculated, and its significance for vaccine efficacy.
   - **بار سطحی** (Surface charge): Discuss surface charge distribution, charge redistribution modeling (${pandemicVirusCharacteristics.chargeRedistribution}%), and how glycosylation affects the surface charge map of the epitope.
   - **تعاملات پروتئین–پادتن** (Protein-antibody interactions): Analyze the interaction map between the reconstructed epitope and antibodies. Explain how the AI model predicted optimal binding sites and interaction patterns.

2. MANDATORY SUMMARY TABLE - You MUST include a comprehensive summary table with at least 8-10 rows covering:
   - Key molecular parameters (ΔG, charge redistribution, epitope status)
   - Epidemiological statistics (infection rates, mortality, recovery)
   - Vaccine effectiveness metrics
   - Population impact before/after vaccination

TASK: Generate a comprehensive, detailed, and highly technical AI report in Persian using Markdown format.

IMPORTANT: Make the output beautiful and visually clear by:
- Using proper header hierarchy (# for main title, ## for sections, ### for subsections)
- Highlighting ALL important words, scientific terms, and numbers with **bold**
- Using code formatting (backticks) for technical terms and formulas
- Using clear titles and headers that stand out
- Making tables well-formatted with proper alignment
- Using proper spacing between sections
- Making sure every key concept, number, and term is highlighted for maximum clarity

Start with "===REPORT_START==="

Generate a detailed report with these EXACT sections:

1. # گزارش هوش مصنوعی: طراحی واکسن تطبیقی
   
   Write a comprehensive introduction (2-3 paragraphs) explaining:
   - The role of AI in adaptive vaccine design
   - The scientific approach using molecular AI models
   - The importance of epitope reconstruction for vaccine development
   - How this project uses AI to rebuild 3D epitope structures under glycosylation layers

2. ## تحلیل ویروس و ویژگی‌های مولکولی
   
   Write detailed analysis (3-4 paragraphs) covering:
   - Virus characteristics: ${pandemicVirusCharacteristics.mutationRate}, ${pandemicVirusCharacteristics.resistanceLevel}
   - Spread pattern analysis with specific numbers from stage 1
   - Population impact: ${stage1Stats.peakInfected} peak infections, ${stage1Stats.totalDeaths} deaths, ${stage1Stats.totalRecovered} recovered
   - Molecular properties and their implications

3. ## مدل‌سازی هوش مصنوعی مولکولی برای بازسازی اپی‌توپ
   
   This is the MOST IMPORTANT section. Write extensively (4-5 paragraphs) about:
   
   **3.1. بازسازی ساختار سه‌بعدی اپی‌توپ زیر لایهٔ گلیکوزیلاسیون:**
   - Explain how the AI molecular model reconstructed the 3D structure of the epitope beneath the glycosylation layer
   - Describe the structural algorithms used
   - Discuss the challenges of modeling hidden epitopes
   - Mention the current status: ${pandemicVirusCharacteristics.epitopeReconstruction}
   
   **3.2. تخمین انرژی اتصال پادتن–آنتی‌ژن (ΔG):**
   - Provide detailed analysis of binding energy: ΔG = ${pandemicVirusCharacteristics.bindingEnergy} kcal/mol
   - Explain what this value means for antibody-antigen binding affinity
   - Discuss how ΔG was calculated using the AI model
   - Analyze the significance for vaccine efficacy
   - Explain how changes in ΔG affect immune system recognition
   
   **3.3. بازسازی سطح اپی‌توپ بر اساس الگوریتم‌های ساختاری:**
   - Describe the surface reconstruction algorithms
   - Explain how the AI model mapped the epitope surface
   - Discuss the relationship between surface structure and antigen recognition
   
   **3.4. مدل‌سازی افت بار سطحی (Charge Redistribution) پس از گلیکوزیلاسیون:**
   - Analyze charge redistribution: ${pandemicVirusCharacteristics.chargeRedistribution}%
   - Explain how glycosylation affects surface charge distribution
   - Discuss the charge redistribution modeling approach
   - Explain how this affects protein-antibody interactions
   
   **3.5. نقشه تعاملات پروتئین–پادتن:**
   - Analyze the interaction map between the reconstructed epitope and antibodies
   - Explain how the AI model predicted optimal binding sites
   - Describe the interaction patterns and their significance
   - Discuss how this map guides vaccine design

4. ## طراحی واکسن و فرآیند بهینه‌سازی
   
   Write detailed explanation (3-4 paragraphs) about:
   - How AI analyzed the molecular data to design the vaccine
   - The vaccine design process based on epitope reconstruction
   - Key decisions made by AI based on ΔG, charge redistribution, and interaction maps
   - Technical details about vaccine components and formulation
   - How the reconstructed epitope was used to train the immune system

5. ## توزیع واکسن و ارزیابی نتایج
   
   Write comprehensive analysis (3-4 paragraphs) covering:
   - Vaccine distribution strategy
   - Impact on population: ${stage3Stats.vaccinated} vaccinated, ${stage3Stats.finalStats[PANDEMIC_STATUS.HEALTHY]} healthy, ${stage3Stats.finalStats[PANDEMIC_STATUS.INFECTED]} still infected
   - Detailed comparison before/after vaccination with specific numbers
   - Effectiveness metrics and statistical analysis

6. ## جدول خلاصه نتایج (MANDATORY)
   
   You MUST include a comprehensive summary table in this format:
   
   | پارامتر | مقدار | واحد | توضیحات |
   |---------|-------|------|---------|
   | انرژی اتصال (ΔG) | ${pandemicVirusCharacteristics.bindingEnergy} | kcal/mol | انرژی اتصال پادتن-آنتی‌ژن |
   | توزیع مجدد بار | ${pandemicVirusCharacteristics.chargeRedistribution} | درصد | تغییر بار سطحی پس از گلیکوزیلاسیون |
   | وضعیت بازسازی اپی‌توپ | ${pandemicVirusCharacteristics.epitopeReconstruction} | - | وضعیت فعلی بازسازی |
   | نرخ جهش | ${pandemicVirusCharacteristics.mutationRate} | - | سطح جهش ویروس |
   | سطح مقاومت | ${pandemicVirusCharacteristics.resistanceLevel} | - | مقاومت ویروس |
   | اوج آلودگی | ${stage1Stats.peakInfected} | نفر | بیشترین تعداد آلوده در مرحله اول |
   | کل فوت‌شدگان | ${stage1Stats.totalDeaths} | نفر | تعداد کل مرگ‌ها |
   | کل بهبودیافتگان | ${stage1Stats.totalRecovered} | نفر | تعداد کل بهبودیافتگان |
   | واکسینه‌شده | ${stage3Stats.vaccinated} | نفر | تعداد واکسینه‌شده‌ها |
   | سالم نهایی | ${stage3Stats.finalStats[PANDEMIC_STATUS.HEALTHY]} | نفر | تعداد سالم در پایان |
   | آلوده نهایی | ${stage3Stats.finalStats[PANDEMIC_STATUS.INFECTED]} | نفر | تعداد آلوده در پایان |
   
   Add at least 2-3 more relevant rows with calculated metrics (e.g., vaccine effectiveness percentage, reduction in mortality rate, etc.)

7. ## نتیجه‌گیری و توصیه‌ها
   
   Write comprehensive conclusion (2-3 paragraphs) covering:
   - Overall assessment of the AI-designed vaccine
   - Effectiveness evaluation based on molecular and epidemiological data
   - Scientific recommendations for future vaccine development
   - Implications for adaptive vaccine design using AI molecular modeling

FORMATTING REQUIREMENTS - CRITICAL FOR BEAUTIFUL OUTPUT:
- Use Markdown format (NOT HTML)
- **HEADERS HIERARCHY** - Use proper header levels for clear structure:
  * Use # for main title (h1) - only once at the beginning
  * Use ## for major section headers (h2) - for main sections
  * Use ### for subsection headers (h3) - for subsections
  * Use #### for sub-subsections (h4) - for detailed points
- **HIGHLIGHTING IMPORTANT WORDS**:
  * Use **bold** (**text**) for important scientific terms, key concepts, and critical numbers
  * Use code formatting (backticks) for technical terms, formulas, and specific values
  * Use ***bold italic*** for extremely important concepts
  * Highlight ALL scientific terminology, percentages, and key metrics with **bold**
  * Make sure titles, headers, and important words stand out clearly
- **TABLES** - Use proper Markdown table syntax with alignment:
  * Use | for columns
  * Use :---: for center alignment, ---: for right, :--- for left
  * Make tables clean and well-spaced
  * Highlight important numbers in tables with **bold**
- **LISTS**:
  * Use - or * for bullet lists
  * Use numbered lists (1. 2. 3.) for ordered lists
  * Use nested lists with proper indentation (2 spaces)
- **EMPHASIS**:
  * Use **bold** for key terms, numbers, and important concepts
  * Use *italic* for emphasis on specific points
  * Use > blockquotes for important notes or highlights
- **STRUCTURE**:
  * Start with a clear main title using # (h1)
  * Use ## for each major section
  * Use ### for subsections within major sections
  * Add clear spacing between sections (blank lines)
- **NUMBERS AND DATA**:
  * Always highlight percentages and numbers with **bold**
  * Use specific numbers from the simulation data provided
  * Format numbers clearly (e.g., **${stage1Stats.peakInfected} نفر** not just ${stage1Stats.peakInfected})
- Write in a highly technical, scientific, and professional tone
- Use proper Persian scientific terminology
- Each section should be detailed and comprehensive (minimum 2-3 paragraphs per major section)

QUALITY REQUIREMENTS:
- The report must be detailed, professional, and complete
- All scientific terms mentioned in requirements MUST be discussed in depth and **highlighted with bold**
- The summary table is MANDATORY and must be comprehensive with **bold numbers**
- Use specific numbers from the simulation data provided and **make them bold**
- Make it sound like a real scientific research report
- **Every important word, title, header, and number should be properly formatted for maximum clarity and visual appeal**

End with "===REPORT_END==="`;

    try {
        const response = await fetch(getGeminiApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('No response from AI model');
        }

        const generatedText = data.candidates[0].content.parts[0].text;
        
        // Extract report section
        const reportStart = generatedText.indexOf('===REPORT_START===');
        const reportEnd = generatedText.indexOf('===REPORT_END===');
        
        if (reportStart === -1 || reportEnd === -1) {
            throw new Error('Invalid report format');
        }
        
        let report = generatedText.substring(reportStart + '===REPORT_START==='.length, reportEnd).trim();
        
        // Convert markdown to HTML (basic conversion)
        report = convertMarkdownToHTML(report);
        
        return report;
    } catch (error) {
        console.error('Error generating AI report:', error);
        throw error;
    }
}

function convertMarkdownToHTML(markdown) {
    let html = markdown;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Lists
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>');
    
    // Tables - improved handling
    const lines = html.split('\n');
    let inTable = false;
    let tableRows = [];
    let processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if line is a table row
        if (line.startsWith('|') && line.endsWith('|') && line.length > 2) {
            // Check if it's a separator row (contains dashes)
            if (line.match(/^\|[\s\-:]+\|$/)) {
                // This is a separator, skip it but mark that we're in a table
                if (!inTable && tableRows.length > 0) {
                    inTable = true;
                }
                continue;
            }
            
            // Extract cells
            const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
            
            if (cells.length > 0) {
                if (!inTable) {
                    // First row is header
                    tableRows.push({ type: 'header', cells: cells });
                    inTable = true;
                } else {
                    // Regular row
                    tableRows.push({ type: 'row', cells: cells });
                }
            }
        } else {
            // Not a table row - if we were building a table, close it
            if (inTable && tableRows.length > 0) {
                let tableHTML = '<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">';
                
                tableRows.forEach((row, idx) => {
                    if (row.type === 'header') {
                        tableHTML += '<thead><tr>';
                        row.cells.forEach(cell => {
                            tableHTML += `<th style="border: 1px solid #ddd; padding: 12px; text-align: right; background-color: #f5f5f5; font-weight: bold;">${cell}</th>`;
                        });
                        tableHTML += '</tr></thead><tbody>';
                    } else {
                        tableHTML += '<tr>';
                        row.cells.forEach(cell => {
                            tableHTML += `<td style="border: 1px solid #ddd; padding: 12px; text-align: right;">${cell}</td>`;
                        });
                        tableHTML += '</tr>';
                    }
                });
                
                tableHTML += '</tbody></table>';
                processedLines.push(tableHTML);
                tableRows = [];
                inTable = false;
            }
            
            // Add the non-table line
            if (line.length > 0) {
                processedLines.push(lines[i]);
            }
        }
    }
    
    // Handle table at end of document
    if (inTable && tableRows.length > 0) {
        let tableHTML = '<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">';
        
        tableRows.forEach((row, idx) => {
            if (row.type === 'header') {
                tableHTML += '<thead><tr>';
                row.cells.forEach(cell => {
                    tableHTML += `<th style="border: 1px solid #ddd; padding: 12px; text-align: right; background-color: #f5f5f5; font-weight: bold;">${cell}</th>`;
                });
                tableHTML += '</tr></thead><tbody>';
            } else {
                tableHTML += '<tr>';
                row.cells.forEach(cell => {
                    tableHTML += `<td style="border: 1px solid #ddd; padding: 12px; text-align: right;">${cell}</td>`;
                });
                tableHTML += '</tr>';
            }
        });
        
        tableHTML += '</tbody></table>';
        processedLines.push(tableHTML);
    }
    
    html = processedLines.join('\n');
    
    // Paragraphs - handle after tables
    html = html.split('\n\n').map(p => {
        const trimmed = p.trim();
        if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<table') || trimmed.startsWith('<tr') || trimmed.startsWith('<td') || trimmed.startsWith('<th')) {
            return p;
        }
        if (trimmed.length > 0) {
            return '<p>' + trimmed + '</p>';
        }
        return p;
    }).join('\n');
    
    // Wrap list items in ul/ol tags
    html = html.replace(/(<li>.*<\/li>)/gs, (match) => {
        if (match.includes('<ul>') || match.includes('<ol>')) {
            return match;
        }
        return '<ul>' + match + '</ul>';
    });
    
    return html;
}

function showPandemicResults() {
    // This function is kept for backward compatibility but may not be used in new flow
    const resultsContainer = document.getElementById('simulationResultsContainer');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
}

function pandemicAnimate() {
    // Only continue animation if animation is active
    if (!pandemicAnimationActive) {
        pandemicAnimationId = null;
        return;
    }
    
    pandemicCtx.fillStyle = 'rgba(5, 10, 20, 0.2)';
    pandemicCtx.fillRect(0, 0, pandemicCanvas.width, pandemicCanvas.height);
    
    drawPandemicConnections();
    
    pandemicParticles.forEach(p => {
        // Only update stats and infections if simulation is running
        if (pandemicIsRunning) {
            p.update();
        } else {
            // Just move particles for visual effect without changing status
            p.x += p.vx * pandemicSpeed * 0.5;
            p.y += p.vy * pandemicSpeed * 0.5;
            
            if (p.x < 0 || p.x > pandemicCanvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > pandemicCanvas.height) p.vy *= -1;
            
            p.x = Math.max(0, Math.min(pandemicCanvas.width, p.x));
            p.y = Math.max(0, Math.min(pandemicCanvas.height, p.y));
            
            p.glowPhase += 0.1;
        }
        p.draw();
    });
    
    if (pandemicIsRunning) {
        checkPandemicInfections();
        updatePandemicStats();
        pandemicFrameCount++;
    }
    
    pandemicAnimationId = requestAnimationFrame(pandemicAnimate);
}

function initPandemicChart() {
    const chartCanvas = document.getElementById('pandemic-chart-canvas');
    if (chartCanvas && typeof Chart !== 'undefined') {
        const chartCtx = chartCanvas.getContext('2d');
        const chartData = createChartData();
        pandemicChart = new Chart(chartCtx, {
            type: 'line',
            data: chartData,
            options: createChartOptions(2.5)
        });
    }
    
    // Don't initialize mini chart here - it will be created when simulation starts
}

function createChartData() {
    return {
        labels: [],
        datasets: [
            {
                label: 'سالم',
                data: [],
                borderColor: PANDEMIC_COLORS[PANDEMIC_STATUS.HEALTHY].hex,
                backgroundColor: 'transparent',
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 0
            },
            {
                label: 'آلوده',
                data: [],
                borderColor: PANDEMIC_COLORS[PANDEMIC_STATUS.INFECTED].hex,
                backgroundColor: 'transparent',
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 0
            },
            {
                label: 'بیمار',
                data: [],
                borderColor: PANDEMIC_COLORS[PANDEMIC_STATUS.SICK].hex,
                backgroundColor: 'transparent',
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 0
            },
            {
                label: 'بهبود',
                data: [],
                borderColor: PANDEMIC_COLORS[PANDEMIC_STATUS.RECOVERED].hex,
                backgroundColor: 'transparent',
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 0
            },
            {
                label: 'واکسینه',
                data: [],
                borderColor: PANDEMIC_COLORS[PANDEMIC_STATUS.VACCINATED].hex,
                backgroundColor: 'transparent',
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 0
            },
            {
                label: 'فوت',
                data: [],
                borderColor: PANDEMIC_COLORS[PANDEMIC_STATUS.DEAD].hex,
                backgroundColor: 'transparent',
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 0
            }
        ]
    };
}

function createChartOptions(aspectRatio, isMini = false) {
    return {
        responsive: true,
        maintainAspectRatio: !isMini,
        aspectRatio: isMini ? undefined : aspectRatio,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#00ffff',
                bodyColor: '#e0f7ff',
                borderColor: 'rgba(0, 255, 255, 0.3)',
                borderWidth: 1
            }
        },
        elements: {
            point: {
                radius: 0,
                hoverRadius: 4
            },
            line: {
                borderWidth: 2,
                tension: 0.4,
                fill: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'تعداد افراد',
                    color: '#00ffff',
                    font: {
                        family: 'Vazirmatn, sans-serif',
                        size: 12,
                        weight: 'bold'
                    }
                },
                grid: {
                    color: 'rgba(0, 255, 255, 0.1)',
                    lineWidth: 1
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    font: {
                        size: 10
                    }
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'زمان (فریم)',
                    color: '#00ffff',
                    font: {
                        family: 'Vazirmatn, sans-serif',
                        size: 12,
                        weight: 'bold'
                    }
                },
                grid: {
                    color: 'rgba(0, 255, 255, 0.1)',
                    lineWidth: 1
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    maxTicksLimit: 8,
                    font: {
                        size: 10
                    }
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    };
}

function updatePandemicChart(stats) {
    if (pandemicChart) {
        updateChartData(pandemicChart, stats);
    }
}

function updatePandemicChartMini(stats) {
    if (isSecondarySimulation && pandemicChartMiniSecondary) {
        updateChartData(pandemicChartMiniSecondary, stats);
    } else if (!isSecondarySimulation && pandemicChartMini) {
        updateChartData(pandemicChartMini, stats);
    }
}

function updateChartData(chart, stats) {
    if (!chart) return;
    
    // Keep more data points for scrolling (don't limit to 30)
    // Only limit if we have too many points to avoid performance issues
    const maxPoints = 200;
    if (chart.data.labels.length > maxPoints) {
        chart.data.labels.shift();
        chart.data.datasets.forEach(dataset => dataset.data.shift());
    }
    
    chart.data.labels.push(Math.floor(pandemicFrameCount / 10));
    chart.data.datasets[0].data.push(stats[PANDEMIC_STATUS.HEALTHY]);
    chart.data.datasets[1].data.push(stats[PANDEMIC_STATUS.INFECTED]);
    chart.data.datasets[2].data.push(stats[PANDEMIC_STATUS.SICK]);
    chart.data.datasets[3].data.push(stats[PANDEMIC_STATUS.RECOVERED]);
    chart.data.datasets[4].data.push(stats[PANDEMIC_STATUS.VACCINATED]);
    chart.data.datasets[5].data.push(stats[PANDEMIC_STATUS.DEAD]);
    
    chart.update('none');
    
    // Auto-scroll to end for mini charts
    if (chart.canvas && chart.canvas.parentElement) {
        const wrapper = chart.canvas.parentElement;
        if (wrapper.classList.contains('simulation-chart-mini-wrapper')) {
            // Scroll to the end to show latest data
            setTimeout(() => {
                wrapper.scrollLeft = wrapper.scrollWidth;
            }, 10);
        }
    }
}

function initNewPandemicSimulation() {
    pandemicCanvas = document.getElementById('pandemic-simulation-canvas');
    
    if (!pandemicCanvas) return;
    
    pandemicCtx = pandemicCanvas.getContext('2d');
    
    liveLogsContainer = document.getElementById('simulationLiveLogs');
    
    resizePandemicCanvases();
    
    window.addEventListener('resize', resizePandemicCanvases);
    
    initPandemicChart();
}

function startPandemicSimulation() {
    if (pandemicIsRunning) return;
    
    const startBtn = document.getElementById('startSimBtn');
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = 'در حال اجرا...';
    }
    
    // Hide vaccine button when starting new simulation
    const vaccineBtn = document.getElementById('vaccineBtn');
    if (vaccineBtn) {
        vaccineBtn.style.display = 'none';
    }
    
    // Clear live logs
    if (liveLogsContainer) {
        liveLogsContainer.innerHTML = '';
    }
    
    // Reset stages
    pandemicStage = 1;
    pandemicStage1Complete = false;
    
    // Generate random virus characteristics
    pandemicVirusCharacteristics = generateVirusCharacteristics();
    pandemicCurrentParams = generateRandomParams();
    displayParams(pandemicCurrentParams, pandemicVirusCharacteristics);
    
    // Hide results sections
    const resultsContainer = document.getElementById('simulationResultsContainer');
    if (resultsContainer) resultsContainer.style.display = 'none';
    
    pandemicSpeed = 2;
    pandemicInfectionRadius = parseFloat(pandemicCurrentParams.infectionRadius) * 20;
    pandemicInfectionRate = pandemicCurrentParams.infectionRate / 100;
    pandemicInfectionDuration = pandemicCurrentParams.infectionDuration * 60;
    pandemicMortalityRate = parseFloat(pandemicCurrentParams.mortalityRate);
    pandemicVaccinationRate = 0;
    
    pandemicFrameCount = 0;
    pandemicSimulationData = [];
    
    if (pandemicChart) {
        pandemicChart.data.labels = [];
        pandemicChart.data.datasets.forEach(dataset => dataset.data = []);
        pandemicChart.update();
    }
    
    // Initialize mini chart only when simulation starts
    if (!pandemicChartMini) {
        const chartCanvasMini = document.getElementById('pandemic-chart-canvas-mini');
        if (chartCanvasMini && typeof Chart !== 'undefined') {
            const chartCtxMini = chartCanvasMini.getContext('2d');
            const chartDataMini = createChartData();
            pandemicChartMini = new Chart(chartCtxMini, {
                type: 'line',
                data: chartDataMini,
                options: createChartOptions(1.5, true)
            });
        }
    } else {
        pandemicChartMini.data.labels = [];
        pandemicChartMini.data.datasets.forEach(dataset => dataset.data = []);
        pandemicChartMini.update();
    }
    
    initPandemicParticles();
    updatePandemicStats();
    
    pandemicIsRunning = true;
    pandemicAnimationActive = true;
    pandemicAnimate();
}

function resetPandemicSimulation() {
    // Stop all animations
    pandemicIsRunning = false;
    pandemicAnimationActive = false;
    
    if (pandemicAnimationId) {
        cancelAnimationFrame(pandemicAnimationId);
        pandemicAnimationId = null;
    }
    
    // Reset buttons
    const startBtn = document.getElementById('startSimBtn');
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = '▶ شروع شبیه‌سازی';
    }
    
    // Hide vaccine button
    const vaccineBtn = document.getElementById('vaccineBtn');
    if (vaccineBtn) {
        vaccineBtn.style.display = 'none';
        vaccineBtn.disabled = false;
    }
    
    // Clear live logs
    if (liveLogsContainer) {
        liveLogsContainer.innerHTML = '';
    }
    
    // Reset all simulation variables
    pandemicStage = 1;
    pandemicStage1Complete = false;
    pandemicFrameCount = 0;
    pandemicSimulationData = [];
    isSecondarySimulation = false;
    stage1Data = null;
    stage2Data = null;
    comparisonReportPromise = null;
    
    // Reset parameters (will be regenerated on next start)
    pandemicVirusCharacteristics = null;
    pandemicCurrentParams = null;
    
    // Clear canvas
    const canvas = document.getElementById('pandemic-simulation-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Destroy all charts
    if (pandemicChart) {
        pandemicChart.data.labels = [];
        pandemicChart.data.datasets.forEach(dataset => dataset.data = []);
        pandemicChart.update();
    }
    
    if (pandemicChartMini) {
        pandemicChartMini.destroy();
        pandemicChartMini = null;
    }
    
    if (pandemicChartMiniSecondary) {
        pandemicChartMiniSecondary.destroy();
        pandemicChartMiniSecondary = null;
    }
    
    // Clear parameters display
    const paramsDisplay = document.getElementById('simulationParamsDisplay');
    if (paramsDisplay) {
        paramsDisplay.innerHTML = '';
    }
    
    // Hide and clear results containers
    const resultsContainer = document.getElementById('simulationResultsContainer');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        const resultsContent = document.getElementById('simulationResultsContent');
        if (resultsContent) {
            resultsContent.innerHTML = '';
        }
    }
    
    // Hide and clear comparison container
    const comparisonContainer = document.getElementById('simulationComparisonContainer');
    if (comparisonContainer) {
        comparisonContainer.style.display = 'none';
        const comparisonContent = document.getElementById('simulationComparisonContent');
        if (comparisonContent) {
            comparisonContent.innerHTML = '';
        }
        const comparisonLoading = document.getElementById('comparisonLoading');
        if (comparisonLoading) {
            comparisonLoading.style.display = 'none';
        }
    }
    
    // Clear particles and reinitialize
    pandemicParticles = [];
    initPandemicParticles();
    updatePandemicStats();
    
    // Reset chart mini containers (will be recreated on next start)
    const chartCanvasMini = document.getElementById('pandemic-chart-canvas-mini');
    if (chartCanvasMini) {
        const ctx = chartCanvasMini.getContext('2d');
        ctx.clearRect(0, 0, chartCanvasMini.width, chartCanvasMini.height);
    }
    
    const chartCanvasMiniSecondary = document.getElementById('pandemic-chart-canvas-mini-secondary');
    if (chartCanvasMiniSecondary) {
        const ctx = chartCanvasMiniSecondary.getContext('2d');
        ctx.clearRect(0, 0, chartCanvasMiniSecondary.width, chartCanvasMiniSecondary.height);
    }
}

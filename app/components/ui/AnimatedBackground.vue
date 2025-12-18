<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);

let ctx: CanvasRenderingContext2D | null = null;
let animationFrameId: number;
let particles: Particle[] = [];
let mouse = { x: -1000, y: -1000 };

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

const config = {
  particleCount: 80, 
  connectionDistance: 120, 
  mouseDistance: 180, 
  baseSpeed: 0.3,
};

const initParticles = (width: number, height: number) => {
  particles = [];
  const count = Math.min(config.particleCount, (width * height) / 10000); 
  
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * config.baseSpeed,
      vy: (Math.random() - 0.5) * config.baseSpeed,
      size: Math.random() * 2 + 1,
    });
  }
};

const draw = () => {
  if (!ctx || !canvasRef.value) return;
  
  const width = canvasRef.value.width;
  const height = canvasRef.value.height;

  ctx.clearRect(0, 0, width, height);

  
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    
    p.x += p.vx;
    p.y += p.vy;

    
    if (p.x < 0 || p.x > width) p.vx *= -1;
    if (p.y < 0 || p.y > height) p.vy *= -1;

    
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(124, 58, 237, 0.5)'; 
    ctx.fill();

    
    for (let j = i + 1; j < particles.length; j++) {
      const p2 = particles[j];
      const dx = p.x - p2.x;
      const dy = p.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < config.connectionDistance) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(124, 58, 237, ${0.15 * (1 - dist / config.connectionDistance)})`;
        ctx.lineWidth = 1;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    
    const dx = p.x - mouse.x;
    const dy = p.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < config.mouseDistance) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(139, 92, 246, ${0.3 * (1 - dist / config.mouseDistance)})`; 
      ctx.lineWidth = 1.2;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(mouse.x, mouse.y);
      ctx.stroke();
      
      
      
      
    }
  }

  animationFrameId = requestAnimationFrame(draw);
};

const handleResize = () => {
  if (canvasRef.value) {
    canvasRef.value.width = window.innerWidth;
    canvasRef.value.height = window.innerHeight;
    
    if (particles.length === 0) initParticles(window.innerWidth, window.innerHeight);
  }
};

const handleMouseMove = (e: MouseEvent) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
};

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d');
    handleResize();
    initParticles(window.innerWidth, window.innerHeight);
    draw();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('mousemove', handleMouseMove);
  cancelAnimationFrame(animationFrameId);
});
</script>

<template>
  <canvas ref="canvasRef" class="animated-background"></canvas>
</template>

<style scoped>
.animated-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;  
  pointer-events: none;  
  background: transparent;  
}
</style>

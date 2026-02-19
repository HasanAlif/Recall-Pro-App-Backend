export const LANDING_PAGE_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recall Pro - Salon Management Server</title>
    <style>
        :root {
            --bg-color: #0d0a12;
            --card-bg-dark: rgba(18, 12, 26, 0.95);
            --card-bg-light: rgba(30, 20, 45, 0.95);
            --text-primary: #f5f0ff;
            --text-secondary: #b8a8cc;
            --accent-rose: #e8578a;
            --accent-purple: #9b59b6;
            --accent-gold: #f0c060;
            --gradient-salon: linear-gradient(135deg, #e8578a, #9b59b6, #f0c060);
            --gradient-rose: linear-gradient(135deg, #e8578a, #f4a0c0);
            --gradient-purple: linear-gradient(135deg, #9b59b6, #c39bd3);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            background-color: var(--bg-color);
            color: var(--text-primary);
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow-x: hidden;
            background-image:
                radial-gradient(circle at 15% 25%, rgba(232, 87, 138, 0.1) 0%, transparent 30%),
                radial-gradient(circle at 85% 75%, rgba(155, 89, 182, 0.1) 0%, transparent 30%),
                radial-gradient(circle at 50% 50%, rgba(240, 192, 96, 0.04) 0%, transparent 50%);
        }

        /* Floating Salon Particles */
        .salon-particles {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            z-index: 0;
        }
        .particle {
            position: absolute;
            opacity: 0;
            animation: floatParticle 18s linear infinite;
        }
        @keyframes floatParticle {
            0%   { transform: translateY(110vh) rotate(0deg) scale(0.8); opacity: 0; }
            8%   { opacity: 1; }
            90%  { opacity: 0.8; }
            100% { transform: translateY(-15vh) rotate(360deg) scale(1.1); opacity: 0; }
        }

        /* Hero Banner */
        .hero {
            text-align: center;
            margin-bottom: 3rem;
            padding: 0 1rem;
        }
        .hero-logo {
            font-size: 3.5rem;
            margin-bottom: 0.4rem;
            animation: spinScissor 6s ease-in-out infinite;
            display: inline-block;
        }
        @keyframes spinScissor {
            0%, 100% { transform: rotate(-10deg) scale(1); }
            50%       { transform: rotate(10deg) scale(1.1); }
        }
        .hero h1 {
            font-size: clamp(2rem, 5vw, 3.2rem);
            font-weight: 900;
            letter-spacing: -1px;
            line-height: 1.15;
            margin-bottom: 0.6rem;
        }
        .hero p {
            font-size: 1.1rem;
            color: var(--text-secondary);
            max-width: 500px;
            margin: 0 auto;
            line-height: 1.6;
        }
        .tagline-divider {
            width: 60px;
            height: 3px;
            background: var(--gradient-salon);
            border-radius: 2px;
            margin: 1rem auto;
        }

        .stage {
            width: 100%;
            max-width: 1200px;
            padding: 2rem;
            z-index: 1;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
            gap: 1.8rem;
        }

        .card {
            padding: 2.2rem;
            border-radius: 24px;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(232, 87, 138, 0.12);
            backdrop-filter: blur(14px);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.25);
        }
        .card::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 24px;
            background: linear-gradient(135deg, rgba(232, 87, 138, 0.04), transparent 60%);
            pointer-events: none;
        }
        .card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6),
                        0 0 25px rgba(232, 87, 138, 0.18),
                        0 0 50px rgba(155, 89, 182, 0.1);
            border-color: rgba(232, 87, 138, 0.35);
        }
        .card.light { background-color: var(--card-bg-light); }
        .card.dark  { background-color: var(--card-bg-dark); }

        h2 {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 0.8rem;
            line-height: 1.3;
        }
        p.lead {
            font-size: 1rem;
            color: var(--text-secondary);
            line-height: 1.65;
        }

        .gtext {
            background: var(--gradient-salon);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            font-weight: 900;
            display: inline-block;
        }

        /* Animated Icon Circle */
        .icon-container {
            width: 75px;
            height: 75px;
            background: linear-gradient(135deg, rgba(232, 87, 138, 0.1), rgba(155, 89, 182, 0.08));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.4rem;
            font-size: 2.2rem;
            border: 1px solid rgba(232, 87, 138, 0.2);
            animation: pulseSalon 3s ease-in-out infinite;
        }
        @keyframes pulseSalon {
            0%   { box-shadow: 0 0 0 0 rgba(232, 87, 138, 0.3); border-color: rgba(232, 87, 138, 0.2); }
            50%  { box-shadow: 0 0 0 12px rgba(232, 87, 138, 0); border-color: rgba(232, 87, 138, 0.55); }
            100% { box-shadow: 0 0 0 0 rgba(232, 87, 138, 0); border-color: rgba(232, 87, 138, 0.2); }
        }

        /* Scissor snip animation on welcome card */
        .scissor-wrapper {
            position: relative;
            display: inline-block;
        }
        .sparkle {
            position: absolute;
            font-size: 0.9rem;
            opacity: 0;
            animation: sparkleAnim 2.5s ease-in-out infinite;
        }
        .sparkle:nth-child(1) { top: -14px; left: -10px; animation-delay: 0s; }
        .sparkle:nth-child(2) { top: -14px; right: -10px; animation-delay: 0.5s; }
        .sparkle:nth-child(3) { bottom: -10px; left: 50%; transform: translateX(-50%); animation-delay: 1s; }
        @keyframes sparkleAnim {
            0%, 100% { opacity: 0; transform: scale(0.5) translateY(0); }
            50% { opacity: 1; transform: scale(1.2) translateY(-4px); }
        }

        /* Status Badge */
        .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 0.45rem 1.1rem;
            background: rgba(40, 167, 69, 0.12);
            border: 1px solid rgba(40, 167, 69, 0.4);
            border-radius: 50px;
            color: #4cd964;
            font-size: 0.88rem;
            font-weight: 600;
            margin-top: 1.4rem;
            transition: all 0.3s ease;
        }
        .status-badge:hover {
            background: rgba(40, 167, 69, 0.22);
            box-shadow: 0 0 16px rgba(76, 217, 100, 0.3);
        }
        .status-dot {
            width: 9px;
            height: 9px;
            background-color: #4cd964;
            border-radius: 50%;
            margin-right: 9px;
            box-shadow: 0 0 8px #4cd964;
            animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.75); }
        }

        /* Services mini-list */
        .service-list {
            list-style: none;
            margin-top: 1rem;
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        .service-list li {
            background: rgba(232, 87, 138, 0.1);
            border: 1px solid rgba(232, 87, 138, 0.2);
            border-radius: 30px;
            padding: 0.3rem 0.85rem;
            font-size: 0.82rem;
            color: #f4a0c0;
            font-weight: 500;
            transition: all 0.3s;
        }
        .service-list li:hover {
            background: rgba(232, 87, 138, 0.22);
            transform: translateY(-2px);
        }

        /* Booking Slots visual */
        .slots-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 7px;
            margin-bottom: 1.4rem;
        }
        .slot {
            height: 26px;
            border-radius: 6px;
            animation: fillSlot 1.2s ease forwards;
            transform: scaleX(0);
            transform-origin: left;
        }
        .slot.booked  { background: var(--gradient-rose); }
        .slot.open    { background: rgba(155, 89, 182, 0.3); border: 1px solid rgba(155, 89, 182, 0.4); }
        .slot:nth-child(1)  { animation-delay: 0.05s; }
        .slot:nth-child(2)  { animation-delay: 0.15s; }
        .slot:nth-child(3)  { animation-delay: 0.25s; }
        .slot:nth-child(4)  { animation-delay: 0.35s; }
        .slot:nth-child(5)  { animation-delay: 0.45s; }
        .slot:nth-child(6)  { animation-delay: 0.55s; }
        .slot:nth-child(7)  { animation-delay: 0.65s; }
        .slot:nth-child(8)  { animation-delay: 0.75s; }
        .slots-legend { display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.8rem; color: var(--text-secondary); }
        .legend-dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; margin-right: 5px; vertical-align: middle; }
        @keyframes fillSlot {
            to { transform: scaleX(1); }
        }

        /* Star rating */
        .stars {
            display: flex;
            gap: 4px;
            margin-bottom: 1rem;
            font-size: 1.3rem;
        }
        .star {
            animation: starPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            transform: scale(0);
            opacity: 0;
        }
        .star:nth-child(1) { animation-delay: 0.1s; }
        .star:nth-child(2) { animation-delay: 0.2s; }
        .star:nth-child(3) { animation-delay: 0.3s; }
        .star:nth-child(4) { animation-delay: 0.4s; }
        .star:nth-child(5) { animation-delay: 0.5s; }
        @keyframes starPop {
            to { transform: scale(1); opacity: 1; }
        }

    </style>
</head>
<body>
    <div class="salon-particles" id="particles"></div>

    <main class="stage">

        <!-- Hero -->
        <div class="hero">
            <div class="hero-logo">✂️</div>
            <h1>Welcome to <span class="gtext">Recall Pro</span></h1>
            <div class="tagline-divider"></div>
            <p>The smart salon management platform </p>
        </div>

        <section>
            <div class="grid">

                <!-- Salon Identity Card -->
                <article class="card light">
                    <div class="icon-container">
                        <div class="scissor-wrapper">
                            <span class="sparkle">✨</span>
                            <span class="sparkle">💫</span>
                            <span class="sparkle">⭐</span>
                            💇
                        </div>
                    </div>
                    <h2>Your Salon's <span class="gtext">Hub</span></h2>
                    <p class="lead">Manage appointments, track clients & grow your beauty business effortlessly.</p>
                    <ul class="service-list">
                        <li>✂️ Haircut</li>
                        <li>💅 Nails</li>
                        <li>🧖 Facial</li>
                        <li>💆 Massage</li>
                        <li>💈 Styling</li>
                    </ul>
                </article>

                <!-- Server Status Card -->
                <article class="card dark">
                    <div class="icon-container">🚀</div>
                    <h2>Server <span class="gtext">Status</span></h2>
                    <p class="lead">All backend services for Recall Pro are fully operational and running.</p>
                    <div class="status-badge">
                        <span class="status-dot"></span>
                        System Online
                    </div>
                </article>

                <!-- Developer Card -->
                <article class="card light">
                    <div class="stars">
                        <span class="star">⭐</span>
                        <span class="star">⭐</span>
                        <span class="star">⭐</span>
                        <span class="star">⭐</span>
                        <span class="star">⭐</span>
                    </div>
                    <div class="icon-container">👨‍💻</div>
                    <h2>Crafted by <span class="gtext">Alif</span></h2>
                    <p class="lead">Built with passion using Node.js, Express & TypeScript — tailored for modern salons.</p>
                </article>

            </div>
        </section>
    </main>

    <script>
        // Floating salon-themed particles
        const icons = ['✂️', '💄', '💅', '🪞', '💇', '🌸', '✨', '💆', '🌺', '💋'];
        const container = document.getElementById('particles');

        for (let i = 0; i < 22; i++) createParticle();

        function createParticle() {
            const el = document.createElement('div');
            el.classList.add('particle');
            el.innerText = icons[Math.floor(Math.random() * icons.length)];
            el.style.left = Math.random() * 100 + 'vw';
            el.style.fontSize = (Math.random() * 1.2 + 0.8) + 'rem';
            el.style.animationDuration = (Math.random() * 12 + 14) + 's';
            el.style.animationDelay = (Math.random() * 8) + 's';
            el.style.filter = 'opacity(0.35)';
            container.appendChild(el);
        }
    </script>
</body>
</html>
`;

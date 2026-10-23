import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

function Hero() {
  const heroRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      tl.from(".brand", {
        opacity: 0,
        y: -18,
        duration: 0.6,
      })
        .from(
          ".hero-line",
          {
            opacity: 0,
            y: 24,
            duration: 0.7,
            stagger: 0.06,
          },
          "-=0.25"
        )
        .from(
          ".hero-description",
          {
            opacity: 0,
            y: 20,
            duration: 0.6,
          },
          "-=0.2"
        )
        .from(
          ".hero-footer-note",
          {
            opacity: 0,
            y: 12,
            duration: 0.4,
          },
          "-=0.2"
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="hero" ref={heroRef}>
      {/* BRAND */}
      <div className="brand">
        <div className="brand-logo-wrapper">
          <img
            src="/aura-logo.svg"
            alt="Aura Valet Parking"
            className="brand-logo"
          />
        </div>

        <div className="brand-text">
          <h2>AURA</h2>
          <span>VALET PARKING</span>
        </div>
      </div>

      {/* HERO CONTENT */}
      <div className="hero-content">
        <h1>
          <span className="hero-line">
            Elevate Your Arrival.
          </span>

          <span className="hero-line">
            We Refine{" "}
            <span className="hero-gradient">
              the Journey.
            </span>
          </span>
        </h1>

        <p className="hero-description">
          A seamless and sophisticated valet experience
          <br />
          from check-in to checkout.
          <br />
          Your vehicle is safe in our hands.
        </p>
      </div>

      {/* FOOTER */}
      <div className="hero-footer-note">
        © 2026 Aura Valet Parking. All rights reserved.
      </div>
    </div>
  );
}

export default Hero;
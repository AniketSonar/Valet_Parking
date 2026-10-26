function Hero() {
  return (
    <div className="vp-hero-container">
      {/* 
        On desktop, the branding and titles are rendered directly by the 
        exact background image (/valet-hero.png).
        This mobile-content block displays only on mobile screens when the 
        background image collapses to a single-column view.
      */}
      <div className="vp-hero-mobile-content">
        <div className="vp-brand-header">
          <svg className="vp-car-icon" viewBox="0 0 46 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M5 15.5C5 13.57 6.57 12 8.5 12C10.43 12 12 13.57 12 15.5M5 15.5H2C1.45 15.5 1 15.05 1 14.5V13.8C1 12.8 1.6 11.9 2.5 11.6L5.8 10.3C6.4 10.1 6.9 9.6 7.2 9L11.5 2.8C12.1 2 13 1.5 14 1.5H27C27.9 1.5 28.8 1.9 29.3 2.6L34.5 9.2C34.8 9.6 35.3 9.9 35.8 10L42.2 11.3C43.3 11.5 44 12.5 44 13.6V14.5C44 15.05 43.55 15.5 43 15.5H39M12 15.5H32M32 15.5C32 13.57 33.57 12 35.5 12C37.43 12 39 13.57 39 15.5"
              stroke="#c98a2c"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="8.5" cy="15.5" r="2.8" stroke="#c98a2c" strokeWidth="1.8" />
            <circle cx="35.5" cy="15.5" r="2.8" stroke="#c98a2c" strokeWidth="1.8" />
            <path
              d="M14 8.5H24.5V3H14.5L11 8.5H14ZM26.5 8.5H33.5L29 3.5H26.5V8.5Z"
              stroke="#c98a2c"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="vp-brand-title">
            <span className="vp-brand-gold">VALET</span>{" "}
            <span className="vp-brand-dark">PARKING</span>
          </div>
        </div>

        <div className="vp-hero-body">
          <h1 className="hero-main-title">
            <span className="title-valet">Valet</span>{" "}
            <span className="title-parking">Parking</span>
          </h1>
          <h2 className="hero-sub-title">Park with Trust</h2>
          <p className="hero-tagline">
            Luxury parking experience with safety and convenience.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Hero;

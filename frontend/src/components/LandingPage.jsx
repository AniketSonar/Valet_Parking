import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Car,
  Shield,
  Smartphone,
  QrCode,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Send,
  Building2,
  Hotel,
  UtensilsCrossed,
  Hospital,
  ShoppingBag,
  Award,
  Users,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  TrendingUp,
  KeyRound,
  Zap,
  Check,
  Star,
  Activity
} from "lucide-react";
import "./LandingPage.css";
import "./layout/css/theme-unify.css";

const LandingPage = () => {
  const navigate = useNavigate();

  // Active step tab in interactive demo simulation
  const [activeStep, setActiveStep] = useState(0);

  // Contact / Demo form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    businessType: "Hotel & Hospitality",
    vehiclesPerDay: "100 - 300 vehicles",
    message: ""
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-cycle through the 4 steps preview every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setFormSubmitted(true);
    }, 700);
  };

  const stepDetails = [
    {
      num: "01",
      title: "Digital Curbside Intake",
      desc: "Attendant keys in plate number. Customer instantly gets SMS with digital QR token.",
      img: "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=80",
      badge: "Intake Speed: < 20 secs",
      metric: "98% Paperless"
    },
    {
      num: "02",
      title: "Valet Mobile Slot Allocation",
      desc: "Driver is guided straight to an available slot with key safely locked in slot tag.",
      img: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80",
      badge: "Real-Time GPS & Bay Mapping",
      metric: "100% Slot Accuracy"
    },
    {
      num: "03",
      title: "1-Tap Mobile Retrieval",
      desc: "Guests tap 'Request Vehicle' from dinner table. Valet gets dispatch ping immediately.",
      img: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80",
      badge: "Zero Queues at Porch",
      metric: "Avg Retrieval: 3.5 mins"
    },
    {
      num: "04",
      title: "Contactless Handover & Pay",
      desc: "QR code verified at exit. Frictionless tip & payment processed on phone.",
      img: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80",
      badge: "Contactless & Secure",
      metric: "5-Star Guest Rating"
    }
  ];

  return (
    <div className="landing-container">
      {/* Glow Orbs in Background */}
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>
      <div className="glow-orb orb-3"></div>

      {/* ========================================================
          1. NAVIGATION BAR
      ======================================================== */}
      <nav className="landing-navbar">
        <div className="landing-nav-inner">
          <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="brand-logo-wrapper">
              <img src="/valet-logo.svg" alt="Valet Parking Logo" className="brand-logo" />
            </div>
            <div className="brand-text">
              <h2>VALET</h2>
              <span>PARKING</span>
            </div>
          </div>

          <div className="landing-nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Features</a>
            <a href="#sectors">Sectors</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="landing-nav-actions">
            <Link to="/customer-login" className="landing-btn-ghost">
              Customer Portal
            </Link>
            <Link to="/login" className="landing-btn-primary">
              <span>Staff Login</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ========================================================
          2. HERO SECTION WITH HERO TEXT + TOP DEMO FORM (PARKSMART STYLE)
      ======================================================== */}
      <section className="landing-hero">
        <div className="landing-hero-backdrop"></div>
        <div className="landing-hero-inner">
          <div className="landing-hero-text">
            <div className="landing-badge pulse-badge">
              <Sparkles size={14} />
              <span>Next-Gen Smart Valet Operations</span>
            </div>

            <h1 className="landing-hero-title">
              Elevate Your Arrival. <br />
              <span className="landing-gradient-text">We Digitize the Journey.</span>
            </h1>

            <p className="landing-hero-subtitle">
              Say goodbye to paper tokens and curbside delays. Valet Parking transforms your
              valet parking with automated check-in, real-time slot allocation, and 1-tap guest
              retrieval.
            </p>

            <div className="landing-hero-buttons">
              <Link to="/login" className="landing-btn-hero-primary glow-effect">
                <span>Go to Valet Portal</span>
                <ArrowRight size={18} />
              </Link>
              <Link to="/customer-login" className="landing-btn-hero-secondary">
                <span>Customer Login</span>
              </Link>
            </div>

            {/* Micro Trust Stats */}
            <div className="trust-strip">
              <div className="trust-avatars">
                <span className="avatar av-1">A</span>
                <span className="avatar av-2">R</span>
                <span className="avatar av-3">S</span>
                <span className="avatar av-4">+</span>
              </div>
              <div className="trust-text">
                <div className="stars-row">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill="#fbbf24" color="#fbbf24" />
                  ))}
                </div>
                <span>Trusted by luxury hotels, malls & corporate parks</span>
              </div>
            </div>

            {/* Floating Live Badge Preview */}
            <div className="hero-mini-badge-row">
              <div className="hero-mini-badge">
                <div className="stat-icon-circle green">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <small>Live Handover</small>
                  <strong>Mercedes C-Class (MH 02 BB 1001)</strong>
                  <span>Porch Bay 02 • Valet: Vikram</span>
                </div>
              </div>

              <div className="hero-mini-badge">
                <div className="stat-icon-circle purple">
                  <Zap size={16} />
                </div>
                <div>
                  <small>Avg Wait Time</small>
                  <strong className="time-highlight">3 Min 18 Sec</strong>
                  <span>94% Faster Retrieval</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: THE FILL-OUT FORM RIGHT ON TOP */}
          <div className="landing-hero-form-container">
            <div className="contact-form-card hero-form-card" id="demo-form">
              {formSubmitted ? (
                <div className="form-success-box">
                  <div className="success-icon">
                    <CheckCircle2 size={54} />
                  </div>
                  <h3>Demo Request Received!</h3>
                  <p>
                    Thank you for reaching out. One of our valet mobility specialists will
                    connect with you within 24 hours to schedule your personalized live demo.
                  </p>
                  <button
                    className="landing-btn-hero-primary"
                    onClick={() => {
                      setFormSubmitted(false);
                      setFormData({
                        name: "",
                        email: "",
                        phone: "",
                        company: "",
                        businessType: "Hotel & Hospitality",
                        vehiclesPerDay: "100 - 300 vehicles",
                        message: ""
                      });
                    }}
                  >
                    Submit Another Query
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="contact-form">
                  <div className="form-title-row">
                    <div>
                      <span className="form-kicker">SCHEDULE A WALKTHROUGH</span>
                      <h3>Request a Live Demo</h3>
                      <p>Fill out details below for custom deployment & pricing.</p>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Work Email *</label>
                      <input
                        type="email"
                        name="email"
                        required
                        placeholder="rahul@company.com"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Phone Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Venue / Organization Name *</label>
                      <input
                        type="text"
                        name="company"
                        required
                        placeholder="e.g. Grand Vista Hotel"
                        value={formData.company}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Property Type</label>
                      <select
                        name="businessType"
                        value={formData.businessType}
                        onChange={handleInputChange}
                      >
                        <option>Hotel & Hospitality</option>
                        <option>Restaurant & Nightlife</option>
                        <option>Mall & Shopping Complex</option>
                        <option>Hospital & Clinic</option>
                        <option>Corporate Complex</option>
                        <option>Event Management</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Average Daily Vehicle Volume</label>
                    <select
                      name="vehiclesPerDay"
                      value={formData.vehiclesPerDay}
                      onChange={handleInputChange}
                    >
                      <option>Under 100 vehicles / day</option>
                      <option>100 - 300 vehicles / day</option>
                      <option>300 - 600 vehicles / day</option>
                      <option>600+ vehicles / day</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Message / Requirements (Optional)</label>
                    <textarea
                      name="message"
                      rows="2"
                      placeholder="Specific requirements or parking bays..."
                      value={formData.message}
                      onChange={handleInputChange}
                    />
                  </div>

                  <button type="submit" className="form-submit-btn glow-effect" disabled={loading}>
                    {loading ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <span>Submit Demo Request</span>
                        <Send size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Global Key Metrics Strip */}
        <div className="landing-stats-grid">
          <div className="stat-pill">
            <div className="stat-num-row">
              <strong>90%</strong>
              <TrendingUp size={18} className="trend-up" />
            </div>
            <span>Reduced Guest Porch Wait</span>
          </div>
          <div className="stat-pill">
            <div className="stat-num-row">
              <strong>100%</strong>
              <QrCode size={18} className="trend-up" />
            </div>
            <span>Paperless Digital QR Passes</span>
          </div>
          <div className="stat-pill">
            <div className="stat-num-row">
              <strong>Zero</strong>
              <Shield size={18} className="trend-up" />
            </div>
            <span>Vehicle Misplacement Claims</span>
          </div>
          <div className="stat-pill">
            <div className="stat-num-row">
              <strong>Real-Time</strong>
              <Activity size={18} className="trend-up" />
            </div>
            <span>Live Bay & Key Sync</span>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. INTERACTIVE 4-STEP WORKFLOW SHOWCASE (WITH PHOTO)
      ======================================================== */}
      <section id="how-it-works" className="landing-section">
        <div className="section-header">
          <span className="section-eyebrow">DIGITAL VEHICLE JOURNEY</span>
          <h2>How Valet Parking Works</h2>
          <p>
            An interconnected workflow keeping receptionists, valets, and guests on the exact same page.
          </p>
        </div>

        {/* Step Tab Buttons */}
        <div className="step-tabs-wrapper">
          {stepDetails.map((s, idx) => (
            <button
              key={idx}
              className={`step-tab-btn ${activeStep === idx ? "active" : ""}`}
              onClick={() => setActiveStep(idx)}
            >
              <span className="step-badge">{s.num}</span>
              <span className="step-label">{s.title}</span>
            </button>
          ))}
        </div>

        {/* Interactive Step Preview Card */}
        <div className="interactive-step-card">
          <div className="step-card-text">
            <span className="step-sub-badge">{stepDetails[activeStep].badge}</span>
            <h3>{stepDetails[activeStep].title}</h3>
            <p>{stepDetails[activeStep].desc}</p>

            <div className="step-features-list">
              <div className="step-feature-item">
                <Check size={16} className="check-icon" />
                <span>Instant QR token generated and shared via SMS & link</span>
              </div>
              <div className="step-feature-item">
                <Check size={16} className="check-icon" />
                <span>Damage photos and initial fuel/mileage noted at intake</span>
              </div>
              <div className="step-feature-item">
                <Check size={16} className="check-icon" />
                <span>Zero confusion between front desk and driver attendants</span>
              </div>
            </div>

            <div className="step-metric-highlight">
              <strong>{stepDetails[activeStep].metric}</strong>
              <span>Observed across commercial test deployments</span>
            </div>
          </div>

          <div className="step-card-visual">
            <img
              src={stepDetails[activeStep].img}
              alt={stepDetails[activeStep].title}
              className="step-display-img"
            />
            <div className="step-visual-overlay"></div>
          </div>
        </div>
      </section>

      {/* ========================================================
          4. ENTERPRISE VALUE PILLARS (WITH IMAGERY & ICONS)
      ======================================================== */}
      <section id="features" className="landing-section landing-bg-alt">
        <div className="section-header">
          <span className="section-eyebrow">ENTERPRISE VALET TECHNOLOGY</span>
          <h2>Engineered for High-Pressure Valet Porches</h2>
          <p>Everything required to maintain safety, speed, and 5-star hospitality benchmarks.</p>
        </div>

        <div className="features-grid">
          <div className="feature-item feature-card-img">
            <div className="feature-bg-img" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80')" }}></div>
            <div className="feature-content-inner">
              <div className="feature-icon feature-purple">
                <QrCode size={24} />
              </div>
              <h3>Digital QR Tokens</h3>
              <p>Replaces fragile paper slips. Guests track car status from their phone and request recall with 1 tap.</p>
            </div>
          </div>

          <div className="feature-item feature-card-img">
            <div className="feature-bg-img" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80')" }}></div>
            <div className="feature-content-inner">
              <div className="feature-icon feature-blue">
                <TrendingUp size={24} />
              </div>
              <h3>Live Bay Occupancy</h3>
              <p>Dynamic visual map of parking slots across all levels. Instantly know which floors have free capacity.</p>
            </div>
          </div>

          <div className="feature-item feature-card-img">
            <div className="feature-bg-img" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80')" }}></div>
            <div className="feature-content-inner">
              <div className="feature-icon feature-emerald">
                <Shield size={24} />
              </div>
              <h3>Damage & Incident Logs</h3>
              <p>Curbside vehicle condition log with photo uploads protects your venue against illegitimate liability claims.</p>
            </div>
          </div>

          <div className="feature-item feature-card-img">
            <div className="feature-bg-img" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80')" }}></div>
            <div className="feature-content-inner">
              <div className="feature-icon feature-amber">
                <Clock size={24} />
              </div>
              <h3>Turnaround Speed Metrics</h3>
              <p>Live analytics tracking intake duration, park time, and retrieval latency for individual valet drivers.</p>
            </div>
          </div>

          <div className="feature-item feature-card-img">
            <div className="feature-bg-img" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80')" }}></div>
            <div className="feature-content-inner">
              <div className="feature-icon feature-indigo">
                <Users size={24} />
              </div>
              <h3>Role-Specific Dashboards</h3>
              <p>Custom interfaces for Super Admins, Parking Facility Managers, Front Desk Cashiers, and Drivers.</p>
            </div>
          </div>

          <div className="feature-item feature-card-img">
            <div className="feature-bg-img" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80')" }}></div>
            <div className="feature-content-inner">
              <div className="feature-icon feature-rose">
                <Award size={24} />
              </div>
              <h3>Instant Guest Reviews</h3>
              <p>Capture customer satisfaction scores and feedback directly upon checkout to elevate standards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. SECTORS WITH VIBRANT VENUE CARDS
      ======================================================== */}
      <section id="sectors" className="landing-section">
        <div className="section-header">
          <span className="section-eyebrow">INDUSTRY SOLUTIONS</span>
          <h2>Tailored for Premier Commercial Destinations</h2>
          <p>Custom-fit parking operations designed for high-density, luxury, and sensitive environments.</p>
        </div>

        <div className="sectors-grid">
          <div className="sector-card" style={{ backgroundImage: "linear-gradient(to top, rgba(42, 15, 22, 0.95), rgba(42, 15, 22, 0.45)), url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80')" }}>
            <Hotel className="sector-icon" size={34} />
            <h3>Hotels & Resorts</h3>
            <p>Elevate the prestigious guest arrival and departure standard matching five-star hospitality.</p>
          </div>

          <div className="sector-card" style={{ backgroundImage: "linear-gradient(to top, rgba(42, 15, 22, 0.95), rgba(42, 15, 22, 0.45)), url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80')" }}>
            <UtensilsCrossed className="sector-icon" size={34} />
            <h3>Fine Dining & Lounges</h3>
            <p>Ensure weekend evening crowds never endure 20-minute porch bottlenecks when arriving or leaving.</p>
          </div>

          <div className="sector-card" style={{ backgroundImage: "linear-gradient(to top, rgba(42, 15, 22, 0.95), rgba(42, 15, 22, 0.45)), url('https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=600&q=80')" }}>
            <ShoppingBag className="sector-icon" size={34} />
            <h3>Malls & Retail Plazas</h3>
            <p>Process hundreds of vehicles per hour with high-speed digital tokens and automated bay tracking.</p>
          </div>

          <div className="sector-card" style={{ backgroundImage: "linear-gradient(to top, rgba(42, 15, 22, 0.95), rgba(42, 15, 22, 0.45)), url('https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=600&q=80')" }}>
            <Hospital className="sector-icon" size={34} />
            <h3>Hospitals & Healthcare</h3>
            <p>Provide patients and visiting family members with fast, caring curbside handoffs at entry gates.</p>
          </div>

          <div className="sector-card" style={{ backgroundImage: "linear-gradient(to top, rgba(42, 15, 22, 0.95), rgba(42, 15, 22, 0.45)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80')" }}>
            <Building2 className="sector-icon" size={34} />
            <h3>Corporate Hubs & Events</h3>
            <p>Smoothly coordinate executive movements, VIP conferences, and summit delegations without a hitch.</p>
          </div>
        </div>
      </section>

      {/* ========================================================
          6. CONTACT INFO & PORTAL ACCESS SECTION
      ======================================================== */}
      <section id="contact" className="landing-section landing-bg-alt">
        <div className="contact-bottom-strip">
          <div className="contact-info">
            <span className="section-eyebrow">PARTNER WITH US</span>
            <h2>Ready to Transform Your Valet Experience?</h2>
            <p>
              Contact our solutions team for custom hardware integrations, FASTag setup,
              or dedicated valet fleet management.
            </p>

            <div className="contact-details">
              <div className="contact-item">
                <Phone size={20} />
                <div>
                  <strong>Direct Inquiry</strong>
                  <span>+91 97172 71752 / +91 98765 43210</span>
                </div>
              </div>

              <div className="contact-item">
                <Mail size={20} />
                <div>
                  <strong>Email</strong>
                  <span>contact@valet.com</span>
                </div>
              </div>

              <div className="contact-item">
                <MapPin size={20} />
                <div>
                  <strong>Headquarters</strong>
                  <span>Metro Business Towers</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Login Card on Bottom */}
          <div className="login-quick-banner bottom-banner">
            <h4>Already an active client or staff member?</h4>
            <p>Sign in directly to launch your operations dashboard or manage parking bookings.</p>
            <div className="banner-btns">
              <button onClick={() => navigate("/login")} className="btn-banner-staff">
                Staff Login
              </button>
              <button onClick={() => navigate("/customer-login")} className="btn-banner-customer">
                Customer Portal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          7. FOOTER
      ======================================================== */}
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="brand-logo-wrapper">
              <img src="/valet-logo.svg" alt="Valet Parking Logo" className="brand-logo" />
            </div>
            <h3>VALET PARKING</h3>
            <p>Next-Generation Smart Valet Parking Platform.</p>
          </div>

          <div className="footer-links-group">
            <h4>Quick Links</h4>
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Features</a>
            <a href="#sectors">Sectors</a>
            <a href="#demo-form">Schedule Demo</a>
          </div>

          <div className="footer-links-group">
            <h4>Portals</h4>
            <Link to="/login">Staff Login (Admin & Valet)</Link>
            <Link to="/customer-login">Customer Portal</Link>
            <Link to="/customer-register">Customer Sign Up</Link>
          </div>

          <div className="footer-links-group">
            <h4>Contact</h4>
            <p>Email: contact@valet.com</p>
            <p>Support: 24/7 Operations Desk</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Valet Parking. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

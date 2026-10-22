import React, { useState } from "react";
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
  KeyRound
} from "lucide-react";
import "./LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();

  // Contact / Demo Request Form state
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

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate inquiry submission
    setTimeout(() => {
      setLoading(false);
      setFormSubmitted(true);
    }, 700);
  };

  return (
    <div className="landing-container">
      {/* ========================================================
          1. NAVIGATION BAR
      ======================================================== */}
      <nav className="landing-navbar">
        <div className="landing-nav-inner">
          <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="brand-logo-wrapper">
              <img src="/aura-logo.svg" alt="AURA Logo" className="brand-logo" />
            </div>
            <div className="brand-text">
              <h2>AURA</h2>
              <span>SMART VALET</span>
            </div>
          </div>

          <div className="landing-nav-links">
            <a href="#solutions">Solutions</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Key Features</a>
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
          2. HERO SECTION
      ======================================================== */}
      <section className="landing-hero">
        <div className="landing-hero-backdrop"></div>
        <div className="landing-hero-content">
          <div className="landing-badge">
            <Sparkles size={14} />
            <span>Next-Gen Smart Valet Operations</span>
          </div>

          <h1 className="landing-hero-title">
            Turn Your Valet Service Into a <br />
            <span className="landing-gradient-text">Frictionless Luxury Experience</span>
          </h1>

          <p className="landing-hero-subtitle">
            Say goodbye to paper tokens and long curbside queues. Aura Valet digitizes
            entry, slot allocation, live tracking, and instant guest retrieval with real-time
            accuracy.
          </p>

          <div className="landing-hero-buttons">
            <a href="#contact" className="landing-btn-hero-primary">
              <span>Schedule a Demo</span>
              <ChevronRight size={18} />
            </a>
            <Link to="/login" className="landing-btn-hero-secondary">
              <span>Go to Valet Portal</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="landing-stats-grid">
            <div className="stat-pill">
              <strong>90%</strong>
              <span>Reduced Guest Wait Time</span>
            </div>
            <div className="stat-pill">
              <strong>100%</strong>
              <span>Digital QR & Paperless Tickets</span>
            </div>
            <div className="stat-pill">
              <strong>Real-Time</strong>
              <span>Live Slot & Key Tracking</span>
            </div>
            <div className="stat-pill">
              <strong>Zero</strong>
              <span>Vehicle Misplacement</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. HOW IT WORKS (THE 4-STEP GUEST JOURNEY)
      ======================================================== */}
      <section id="how-it-works" className="landing-section">
        <div className="section-header">
          <span className="section-eyebrow">EFFORTLESS JOURNEY</span>
          <h2>How Aura Valet Works</h2>
          <p>A digitized, transparent workflow from curbside arrival to departure.</p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">01</div>
            <div className="step-icon-box">
              <Car size={26} />
            </div>
            <h3>Curbside Check-In</h3>
            <p>
              Front desk captures the license plate and issues an instant SMS / QR digital ticket.
              Condition photos and mileage can be noted on the spot.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">02</div>
            <div className="step-icon-box">
              <KeyRound size={26} />
            </div>
            <h3>Smart Slot & Key Allocation</h3>
            <p>
              Valet attendants receive parking tasks on their mobile dashboard, park the vehicle in an
              allocated slot, and safely secure the tagged key.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">03</div>
            <div className="step-icon-box">
              <Smartphone size={26} />
            </div>
            <h3>1-Click Guest Retrieval</h3>
            <p>
              Guests scan their ticket or click "Request Vehicle" from their phone while finishing
              their dinner or checkout. No standing in lines.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">04</div>
            <div className="step-icon-box">
              <CheckCircle2 size={26} />
            </div>
            <h3>Seamless Handover & Pay</h3>
            <p>
              Attendants deliver the car to the porch, verify the ticket QR code, and complete
              contactless checkout with digital receipts.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================
          4. KEY VALUE PROPOSITIONS / FEATURES
      ======================================================== */}
      <section id="features" className="landing-section landing-bg-alt">
        <div className="section-header">
          <span className="section-eyebrow">BUILT FOR SCALE</span>
          <h2>Enterprise-Grade Valet Management</h2>
          <p>Everything your operations team needs to maintain speed, safety, and accountability.</p>
        </div>

        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon feature-purple">
              <QrCode size={24} />
            </div>
            <h3>Digital E-Tokens</h3>
            <p>Eliminate lost paper tickets. Customers receive a live ticket link with car status and estimated arrival time.</p>
          </div>

          <div className="feature-item">
            <div className="feature-icon feature-blue">
              <TrendingUp size={24} />
            </div>
            <h3>Live Slot Occupancy</h3>
            <p>Visual map of all parking bays. See vacant, occupied, and maintenance slots in real-time across multiple floors.</p>
          </div>

          <div className="feature-item">
            <div className="feature-icon feature-emerald">
              <Shield size={24} />
            </div>
            <h3>Damage & Incident Logs</h3>
            <p>Record pre-existing scratches and dents during intake to protect your business against fraudulent claims.</p>
          </div>

          <div className="feature-item">
            <div className="feature-icon feature-amber">
              <Clock size={24} />
            </div>
            <h3>Turnaround Analytics</h3>
            <p>Monitor valet retrieval speeds, rush hour bottlenecks, and individual attendant performance metrics.</p>
          </div>

          <div className="feature-item">
            <div className="feature-icon feature-indigo">
              <Users size={24} />
            </div>
            <h3>Role-Based Portals</h3>
            <p>Tailored dashboards for Super Admins, Parking Admins, Front Desk Cashiers, Valet Attendants, and Guests.</p>
          </div>

          <div className="feature-item">
            <div className="feature-icon feature-rose">
              <Award size={24} />
            </div>
            <h3>Guest Feedback & Ratings</h3>
            <p>Gather direct post-service reviews and ratings to maintain 5-star hospitality benchmarks.</p>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. SECTORS / WHO WE SERVE
      ======================================================== */}
      <section id="sectors" className="landing-section">
        <div className="section-header">
          <span className="section-eyebrow">INDUSTRY SOLUTIONS</span>
          <h2>Tailored for High-Traffic Venues</h2>
          <p>Whether it’s a 5-star resort or a busy shopping district, Aura adapts to your needs.</p>
        </div>

        <div className="sectors-grid">
          <div className="sector-card">
            <Hotel className="sector-icon" size={32} />
            <h3>Hotels & Resorts</h3>
            <p>Deliver the welcoming arrival and effortless departure experience that luxury travelers expect.</p>
          </div>

          <div className="sector-card">
            <UtensilsCrossed className="sector-icon" size={32} />
            <h3>Fine Dining & Clubs</h3>
            <p>Eliminate peak-hour parking bottlenecks so diners begin and end their evening with joy.</p>
          </div>

          <div className="sector-card">
            <ShoppingBag className="sector-icon" size={32} />
            <h3>Malls & Retail Centers</h3>
            <p>Handle weekend vehicle volume smoothly with high-speed intake, digital tokens, and rapid vehicle recall.</p>
          </div>

          <div className="sector-card">
            <Hospital className="sector-icon" size={32} />
            <h3>Hospitals & Healthcare</h3>
            <p>Provide patients and visitors with stress-free curbside drop-off right at emergency and OPD doors.</p>
          </div>

          <div className="sector-card">
            <Building2 className="sector-icon" size={32} />
            <h3>Corporate Parks & Events</h3>
            <p>Manage VIP movements, high-profile summits, and daily executive parking with bulletproof auditing.</p>
          </div>
        </div>
      </section>

      {/* ========================================================
          6. CONTACT & DEMO REQUEST FORM
      ======================================================== */}
      <section id="contact" className="landing-section landing-bg-alt">
        <div className="contact-wrapper">
          <div className="contact-info">
            <span className="section-eyebrow">GET IN TOUCH</span>
            <h2>Ready to Upgrade Your Parking Experience?</h2>
            <p>
              Schedule a personalized walkthrough of Aura Valet Parking. Our solutions
              team will demonstrate how easy it is to deploy across your venues.
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
                  <span>sales@auravalet.com / contact@valet.com</span>
                </div>
              </div>

              <div className="contact-item">
                <MapPin size={20} />
                <div>
                  <strong>Headquarters</strong>
                  <span>Aura Smart Mobility Labs, Metro Business Hub</span>
                </div>
              </div>
            </div>

            <div className="login-quick-banner">
              <h4>Already an active client or staff member?</h4>
              <p>Sign in to access your operations dashboard or customer history.</p>
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

          {/* Contact Form Card */}
          <div className="contact-form-card">
            {formSubmitted ? (
              <div className="form-success-box">
                <div className="success-icon">
                  <CheckCircle2 size={48} />
                </div>
                <h3>Thank You for Reaching Out!</h3>
                <p>
                  We have received your demo request. One of our valet mobility specialists
                  will connect with you within 24 hours.
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
                <h3>Request a Live Demo</h3>
                <p>Fill out the details below and we will customize a demo for your site.</p>

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
                    <label>Email Address *</label>
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
                  <label>Average Daily Vehicles</label>
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
                  <label>Message / Specific Requirements</label>
                  <textarea
                    name="message"
                    rows="3"
                    placeholder="Tell us about your parking location or specific requirements..."
                    value={formData.message}
                    onChange={handleInputChange}
                  />
                </div>

                <button type="submit" className="form-submit-btn" disabled={loading}>
                  {loading ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <span>Send Request</span>
                      <Send size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
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
              <img src="/aura-logo.svg" alt="AURA Logo" className="brand-logo" />
            </div>
            <h3>AURA VALET</h3>
            <p>Next-Generation Smart Valet Parking Platform.</p>
          </div>

          <div className="footer-links-group">
            <h4>Quick Links</h4>
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Features</a>
            <a href="#sectors">Sectors</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="footer-links-group">
            <h4>Portals</h4>
            <Link to="/login">Staff Login (Admin & Valet)</Link>
            <Link to="/customer-login">Customer Portal</Link>
            <Link to="/customer-register">Customer Sign Up</Link>
          </div>

          <div className="footer-links-group">
            <h4>Contact</h4>
            <p>Email: contact@auravalet.com</p>
            <p>Support: 24/7 Operations Helpdesk</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Aura Smart Valet Parking Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

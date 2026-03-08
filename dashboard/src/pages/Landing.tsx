import { useState } from 'react';

interface Props {
  onNavigateToLogin: () => void;
}

export function LandingPage({ onNavigateToLogin }: Props) {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      title: 'Real-Time Incident Command',
      desc: 'Monitor every active incident across all districts. Track unit dispatch, response times, and scene status from a single unified command view.',
      stat: '< 4 min',
      statLabel: 'Avg Response Time',
    },
    {
      title: 'AI-Powered Analytics',
      desc: 'Natural language queries powered by Claude AI. Ask questions in plain English — "Show me all structure fires in West Pensacola last month" — and get instant analysis with actionable insights.',
      stat: '90 days',
      statLabel: 'Historical Analysis',
    },
    {
      title: 'Predictive Resource Planning',
      desc: 'Machine learning models analyze historical patterns to predict incident volume by hour, day, and district. Optimize unit placement before calls come in.',
      stat: '45 sec',
      statLabel: 'Response Improvement',
    },
    {
      title: 'Automated Reporting',
      desc: 'Daily shift reports, weekly command briefings, and monthly performance analytics generated automatically. Export-ready for city council and department leadership.',
      stat: '100%',
      statLabel: 'Automated',
    },
  ];

  const capabilities = [
    { title: 'Incident Management', items: ['Multi-agency dispatch tracking', 'Priority-based response protocols', 'Scene time and outcome recording', 'Follow-up and investigation tracking'] },
    { title: 'Resource Optimization', items: ['Unit availability monitoring', 'Station coverage analysis', 'Shift utilization metrics', 'Mutual aid coordination'] },
    { title: 'Performance Metrics', items: ['Response time vs targets by zone', 'District-level performance scoring', 'Percentile analysis (P50, P90)', 'Trend identification and alerting'] },
    { title: 'Intelligence & Prediction', items: ['Natural language data queries', 'Incident pattern recognition', 'Weather correlation analysis', 'Demand forecasting by hour/day'] },
  ];

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-logo">
            <div className="logo-mark">FRA</div>
            <span>First Responder Analytics</span>
          </div>
          <button className="landing-cta-btn" onClick={onNavigateToLogin}>
            Access Platform
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">City of Pensacola Emergency Services</div>
          <h1>Intelligence-Driven<br />Emergency Response</h1>
          <p className="hero-sub">
            AI-powered analytics platform for fire, EMS, and law enforcement.
            Real-time incident tracking, predictive resource planning, and
            automated performance reporting — built for command staff who
            need answers now.
          </p>
          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={onNavigateToLogin}>
              Launch Dashboard
            </button>
            <a href="#capabilities" className="btn-hero-secondary">
              View Capabilities
            </a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">6</span>
              <span className="hero-stat-label">Response Districts</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">30</span>
              <span className="hero-stat-label">Active Units</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">24/7</span>
              <span className="hero-stat-label">Monitoring</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">AI</span>
              <span className="hero-stat-label">Powered Analysis</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="features-inner">
          <h2>Platform Capabilities</h2>
          <p className="section-sub">Purpose-built for first responder command staff and city leadership</p>
          <div className="features-grid">
            {features.map((f, i) => (
              <div
                key={i}
                className={`feature-card ${activeFeature === i ? 'active' : ''}`}
                onMouseEnter={() => setActiveFeature(i)}
              >
                <div className="feature-stat">
                  <span className="feature-stat-value">{f.stat}</span>
                  <span className="feature-stat-label">{f.statLabel}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Detail */}
      <section className="landing-capabilities" id="capabilities">
        <div className="capabilities-inner">
          <h2>Comprehensive Coverage</h2>
          <p className="section-sub">Every aspect of emergency response operations, analyzed and optimized</p>
          <div className="capabilities-grid">
            {capabilities.map((c, i) => (
              <div key={i} className="capability-card">
                <h3>{c.title}</h3>
                <ul>
                  {c.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration */}
      <section className="landing-integration">
        <div className="integration-inner">
          <h2>Built on Trusted Technology</h2>
          <div className="tech-grid">
            <div className="tech-item">
              <div className="tech-label">Database</div>
              <div className="tech-name">PostgreSQL</div>
              <div className="tech-desc">Enterprise-grade relational database with PostGIS spatial extensions</div>
            </div>
            <div className="tech-item">
              <div className="tech-label">AI Engine</div>
              <div className="tech-name">Claude AI</div>
              <div className="tech-desc">Anthropic's advanced language model for natural language analytics</div>
            </div>
            <div className="tech-item">
              <div className="tech-label">Security</div>
              <div className="tech-name">Role-Based Access</div>
              <div className="tech-desc">JWT authentication with chief, captain, dispatcher, and analyst roles</div>
            </div>
            <div className="tech-item">
              <div className="tech-label">API</div>
              <div className="tech-name">RESTful</div>
              <div className="tech-desc">Rate-limited, validated endpoints with full audit logging</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="landing-why-us">
        <div className="section-inner">
          <h2>Why Choose FRA?</h2>
          <p className="section-subtitle">Enterprise-grade analytics without the enterprise price tag or timeline</p>
          <div className="why-us-grid">
            <div className="why-us-item">
              <div className="why-us-icon">&#9889;</div>
              <h3>Deploys in Days, Not Months</h3>
              <p>Unlike Mark43 or Axon, which require 6-12 month implementation cycles, FRA deploys in under a week with your existing data.</p>
            </div>
            <div className="why-us-item">
              <div className="why-us-icon">&#9878;</div>
              <h3>Fraction of the Cost</h3>
              <p>Enterprise platforms like First Due and ImageTrend charge $50K-$500K+ annually. FRA delivers the same insights at a fraction of the price.</p>
            </div>
            <div className="why-us-item">
              <div className="why-us-icon">&#9672;</div>
              <h3>Natural Language AI</h3>
              <p>No complex report builders or SQL knowledge required. Ask questions in plain English and get instant, actionable answers.</p>
            </div>
            <div className="why-us-item">
              <div className="why-us-icon">&#9733;</div>
              <h3>Built for Your Department</h3>
              <p>Designed for small-to-mid size departments that need real analytics but can't justify enterprise platform costs.</p>
            </div>
            <div className="why-us-item">
              <div className="why-us-icon">&#10003;</div>
              <h3>No Long-Term Contracts</h3>
              <p>Month-to-month pricing with no lock-in. We earn your business every month — not through contractual obligations.</p>
            </div>
            <div className="why-us-item">
              <div className="why-us-icon">&#9881;</div>
              <h3>Continuous Innovation</h3>
              <p>Powered by cutting-edge AI that improves constantly. New features and capabilities added regularly at no extra cost.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="cta-inner">
          <h2>Ready to Transform Emergency Response?</h2>
          <p>Access the platform with demo credentials to explore the full analytics suite.</p>
          <button className="btn-hero-primary" onClick={onNavigateToLogin}>
            Access Platform
          </button>
          <div className="cta-note">
            Demo credentials available on the login screen
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="logo-mark small">FRA</div>
            <span>First Responder Analytics Platform</span>
          </div>
          <div className="footer-links">
            <span>Pensacola, FL</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

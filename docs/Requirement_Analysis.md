# Portfolio Management System - Requirements Analysis  

**Last Updated**: 2025-07-24

**Team**: Group 7  

## 1. Target Users  

### Active Investors  

- **Needs**:  
  - Real-time tracking of asset values (stocks, crypto, etc.).  
  - Alerts for price thresholds or market volatility.  
  - Performance analytics (ROI, risk exposure).  
- **Pain Points**:  
  - Manual portfolio updates are error-prone.  
  - Lack of consolidated views across brokers.  

### Potential Investors  

- **Needs**:  
  - Simulated portfolio scenarios ("what-if" analysis).  
  - Market trend visualization (e.g., historical charts).  
  - Educational content (e.g., risk diversification guides).  

## 2. Key Value Propositions

| Feature | Benefit |  
|---------|---------|  
| **Live Data Sync** | Integrates with 10+ market APIs (Alpha Vantage, Binance). |  
| **Unified Dashboard** | Aggregates assets from multiple brokers via OAuth. |  
| **Risk Advisor** | Suggests rebalancing based on user’s risk profile. |  

## 3. Technical Requirements

### API Integration

- **Data Sources**:  
  - Market Data: Alpha Vantage (free tier: 500 calls/month).  
  - Exchange Rates: Fixer.io (supports 170 currencies).  
- **Caching**: Redis for API responses (TTL: 1 hour).  

### Frontend

- **Framework**: JavaScript, E-charts  
- **Responsive Design**: Mobile-first layout (Figma mockups ).  

### Backend 

- **Batch Processing**: Combine API calls to avoid rate limits.  
- **Security**: JWT authentication for user data.  

---

### **2. Technical Solution (`technical_solution.md`)**

```markdown
# Technical Architecture  
## 1. Tech Stack  
| Component | Choice | Rationale |  
|-----------|--------|-----------|  
| Frontend  | React + TypeScript | Type safety for financial calculations. |  
| Backend   | Node.js (Express) | Lightweight, scalable for API middleware. |  
| Database  | PostgreSQL | ACID compliance for transactional data. |  
| DevOps    | GitHub Actions | Auto-deploy to AWS ECS on `main` branch push. |  

## 2. System Diagram  
```mermaid
graph LR  
  A[User] --> B[Frontend]  
  B --> C[API Gateway]  
  C --> D[Market Data Microservice]  
  D --> E[Cache Layer (Redis)]  
  C --> F[User Portfolio DB]  
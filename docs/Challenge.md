### **4. Challenges & Solutions (`challenges.md`)**

# Lessons Learned  
## 1. Git Chaos → Structured Commits  
- **Before**: "Fixed stuff" (no traceability).  
- **After**: Enforced [Conventional Commits](https://www.conventionalcommits.org/).  

## 2. API Rate Limits  
### Problem:  
- Alpha Vantage blocked us after 500 calls in testing.  

### Solutions:  
1. **Caching**:  
   ```javascript  
   // Redis example  
   redis.set(`AAPL_${date}`, JSON.stringify(data), { EX: 3600 });
2. **Request Queue**:
Used Bull.js to throttle API calls (5 requests/minute).
# 🔒 Security Checklist for Dave's Moving Consultant

## 🚨 CRITICAL - Never Commit These Files

### **Environment Files (CONTAINS API KEYS)**
- ❌ `.env` - Contains your actual API keys
- ❌ `.env.local` - Local environment variables
- ❌ `.env.production` - Production environment variables
- ❌ `config.env` - Your current config file
- ❌ `production.env` - Production config file

### **Captured Client Data (PRIVACY SENSITIVE)**
- ❌ `captured_items/` - Contains client room images
- ❌ `*.jpg`, `*.jpeg`, `*.png` - Any image files
- ❌ `*.gif`, `*.webp` - Other image formats

### **Logs and Temporary Files**
- ❌ `logs/` - May contain sensitive information
- ❌ `*.log` - Log files
- ❌ `tmp/`, `temp/` - Temporary files

## ✅ Safe to Commit Files

### **Configuration Templates**
- ✅ `env.template` - Template for environment variables
- ✅ `vercel.json` - Vercel deployment config
- ✅ `railway.json` - Railway deployment config
- ✅ `package.json` - Dependencies and scripts

### **Source Code**
- ✅ `server.js` - Main server code
- ✅ `public/` - Frontend files (HTML, CSS, JS)
- ✅ `vision_analyzer.js` - Vision analysis code
- ✅ `item_capture_system.js` - Item capture code

### **Documentation**
- ✅ `DEPLOYMENT_GUIDE.md` - Deployment instructions
- ✅ `SECURITY_CHECKLIST.md` - This file
- ✅ `README.md` - Project documentation

## 🔧 Pre-Deployment Security Steps

### **1. Check .gitignore**
```bash
# Verify these files are ignored
cat .gitignore | grep -E "(\.env|captured_items|\.log)"
```

### **2. Remove Sensitive Files from Git History**
```bash
# If you accidentally committed sensitive files:
git rm --cached .env
git rm --cached config.env
git rm --cached production.env
git rm -r --cached captured_items/
git commit -m "Remove sensitive files from tracking"
```

### **3. Verify No Sensitive Data in Code**
```bash
# Search for hardcoded API keys
grep -r "sk-" .
grep -r "YjUx" .
grep -r "API62" .
```

## 🚀 Deployment Security

### **Environment Variables Setup**

#### **For Vercel:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add these variables:
   - `ANAM_API_KEY` = your-anam-key
   - `OPENAI_API_KEY` = your-openai-key
   - `DAVE_MODEL` = gpt4o-mini

#### **For Railway:**
```bash
railway variables set ANAM_API_KEY=your-anam-key
railway variables set OPENAI_API_KEY=your-openai-key
railway variables set DAVE_MODEL=gpt4o-mini
```

#### **For AWS/DigitalOcean:**
```bash
# Create .env file on server
nano .env
# Add your environment variables
```

## 🔍 Security Audit Commands

### **Check for Sensitive Data**
```bash
# Search for API keys in code
grep -r "sk-" . --exclude-dir=node_modules
grep -r "YjUx" . --exclude-dir=node_modules
grep -r "API62" . --exclude-dir=node_modules

# Check for environment files
find . -name ".env*" -type f
find . -name "config.env" -type f

# Check for captured items
find . -name "captured_items" -type d
find . -name "*.jpg" -o -name "*.jpeg" -o -name "*.png"
```

### **Verify .gitignore is Working**
```bash
# Check what files would be committed
git status --ignored

# Verify sensitive files are ignored
git check-ignore .env config.env captured_items/
```

## 📋 Pre-Commit Checklist

Before committing to GitHub:

- [ ] All `.env*` files are in `.gitignore`
- [ ] No API keys hardcoded in source code
- [ ] `captured_items/` directory is ignored
- [ ] No log files in repository
- [ ] No temporary files committed
- [ ] Environment template file exists (`env.template`)
- [ ] All sensitive data removed from git history

## 🚨 Emergency Response

### **If You Accidentally Committed Sensitive Data:**

1. **Immediately rotate API keys:**
   - Generate new Anam.ai API key
   - Generate new OpenAI API key
   - Update all deployments

2. **Remove from Git history:**
   ```bash
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch .env config.env' \
   --prune-empty --tag-name-filter cat -- --all
   ```

3. **Force push to GitHub:**
   ```bash
   git push origin --force --all
   ```

## 🔐 Production Security Best Practices

### **API Key Management:**
- ✅ Use environment variables only
- ✅ Rotate keys regularly
- ✅ Monitor API usage
- ✅ Set up rate limiting

### **Data Protection:**
- ✅ HTTPS only in production
- ✅ Regular backups of captured items
- ✅ Secure file storage
- ✅ Access logging

### **Monitoring:**
- ✅ Monitor API usage
- ✅ Track error rates
- ✅ Log security events
- ✅ Set up alerts

## 📞 Support

If you have security concerns:
1. Check this checklist first
2. Review the deployment guide
3. Contact your hosting provider
4. Consider professional security audit for enterprise use

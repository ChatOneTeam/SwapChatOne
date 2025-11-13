/**
 * 详细的日志和报告系统
 */

class TestLogger {
  constructor(options = {}) {
    this.verbose = options.verbose !== false;
    this.reportFile = options.reportFile;
    this.logs = [];
    this.errors = [];
    this.warnings = [];
  }
  
  log(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level: 'info', message, data };
    this.logs.push(logEntry);
    
    if (this.verbose) {
      console.log(`[${timestamp}] ${message}`);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }
  
  error(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level: 'error', message, data };
    this.logs.push(logEntry);
    this.errors.push(logEntry);
    
    console.error(`❌ [${timestamp}] ${message}`);
    if (data) {
      console.error(JSON.stringify(data, null, 2));
    }
  }
  
  warn(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level: 'warning', message, data };
    this.logs.push(logEntry);
    this.warnings.push(logEntry);
    
    console.warn(`⚠️  [${timestamp}] ${message}`);
    if (data) {
      console.warn(JSON.stringify(data, null, 2));
    }
  }
  
  success(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level: 'success', message, data };
    this.logs.push(logEntry);
    
    console.log(`✅ [${timestamp}] ${message}`);
    if (data && this.verbose) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
  
  section(title) {
    const separator = "=".repeat(80);
    console.log(`\n${separator}`);
    console.log(`  ${title}`);
    console.log(`${separator}\n`);
    this.log(`SECTION: ${title}`);
  }
  
  generateReport() {
    const report = {
      summary: {
        totalLogs: this.logs.length,
        errors: this.errors.length,
        warnings: this.warnings.length,
        timestamp: new Date().toISOString()
      },
      logs: this.logs,
      errors: this.errors,
      warnings: this.warnings
    };
    
    if (this.reportFile) {
      const fs = require('fs');
      fs.writeFileSync(this.reportFile, JSON.stringify(report, null, 2));
      console.log(`\n📄 报告已保存到: ${this.reportFile}`);
    }
    
    return report;
  }
}

module.exports = TestLogger;

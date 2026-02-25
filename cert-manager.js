// SSL证书管理模块
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const execPromise = util.promisify(exec);

/**
 * 获取SSL证书状态
 * @returns {Promise<Object>} 证书状态信息
 */
async function getSSLStatus() {
  try {
    // 自动检测域名：从 /etc/letsencrypt/live/ 目录中查找
    let domain = process.env.DOMAIN;
    
    if (!domain) {
      try {
        const { stdout } = await execPromise('ls /etc/letsencrypt/live/ | grep -v README');
        const domains = stdout.trim().split('\n').filter(d => d && d !== 'README');
        if (domains.length > 0) {
          domain = domains[0]; // 使用第一个找到的域名
        }
      } catch (e) {
        domain = 'localhost';
      }
    }
    
    if (!domain || domain === 'localhost') {
      return {
        success: true,
        data: {
          domain: 'localhost',
          expiry: '未安装证书',
          daysLeft: 0,
          autoRenew: false
        }
      };
    }
    
    try {
      // 检查证书文件是否存在
      const certPath = `/etc/letsencrypt/live/${domain}/cert.pem`;
      await fs.access(certPath);
      
      // 获取证书到期时间
      const { stdout } = await execPromise(`openssl x509 -enddate -noout -in ${certPath}`);
      const expiryMatch = stdout.match(/notAfter=(.+)/);
      
      if (expiryMatch) {
        const expiryDate = new Date(expiryMatch[1]);
        const now = new Date();
        const daysLeft = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        return {
          success: true,
          data: {
            domain: domain,
            expiry: expiryDate.toLocaleString('zh-CN'),
            daysLeft: daysLeft,
            autoRenew: await checkAutoRenewStatus()
          }
        };
      }
    } catch (certError) {
      // 证书文件不存在或无法读取
      return {
        success: true,
        data: {
          domain: domain,
          expiry: '未安装证书',
          daysLeft: 0,
          autoRenew: false
        }
      };
    }
    
    return {
      success: false,
      error: '无法获取证书信息'
    };
  } catch (error) {
    console.error('Get SSL status error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 检查自动续订状态
 * @returns {Promise<boolean>} 是否启用自动续订
 */
async function checkAutoRenewStatus() {
  try {
    // 检查crontab中是否有certbot renew任务
    const { stdout } = await execPromise('crontab -l 2>/dev/null || echo ""');
    return stdout.includes('certbot renew');
  } catch {
    return false;
  }
}

/**
 * 续订SSL证书
 * @returns {Promise<Object>} 续订结果
 */
async function renewSSL() {
  try {
    console.log('Starting SSL certificate renewal...');
    
    // 执行实际的证书续订（移除--dry-run以执行真实续订）
    const { stdout, stderr } = await execPromise('sudo certbot renew --force-renewal');
    
    console.log('SSL renewal output:', stdout);
    
    if (stderr && !stderr.includes('successfully')) {
      console.error('SSL renewal stderr:', stderr);
    }
    
    // 重启nginx以应用新证书
    try {
      await execPromise('sudo systemctl reload nginx');
      console.log('Nginx reloaded successfully');
    } catch (nginxError) {
      console.error('Failed to reload nginx:', nginxError.message);
    }
    
    return {
      success: true,
      message: 'SSL证书续订成功'
    };
  } catch (error) {
    console.error('SSL renewal error:', error.message);
    return {
      success: false,
      error: '证书续订失败: ' + error.message
    };
  }
}

/**
 * 设置自动续订
 * @param {boolean} enabled - 是否启用自动续订
 * @returns {Promise<Object>} 设置结果
 */
async function setAutoRenew(enabled) {
  try {
    if (enabled) {
      // 添加cron任务：每天凌晨2点检查并续订证书
      const cronJob = '0 2 * * * certbot renew --quiet && systemctl reload nginx';
      
      // 获取现有的crontab
      let currentCrontab = '';
      try {
        const { stdout } = await execPromise('crontab -l 2>/dev/null || echo ""');
        currentCrontab = stdout;
      } catch {}
      
      // 如果已经存在certbot renew任务，先删除
      const lines = currentCrontab.split('\n').filter(line => !line.includes('certbot renew'));
      lines.push(cronJob);
      
      // 写入新的crontab
      const newCrontab = lines.join('\n');
      await execPromise(`echo "${newCrontab}" | crontab -`);
      
      return {
        success: true,
        message: '自动续订已启用'
      };
    } else {
      // 移除cron任务
      let currentCrontab = '';
      try {
        const { stdout } = await execPromise('crontab -l 2>/dev/null || echo ""');
        currentCrontab = stdout;
      } catch {}
      
      const lines = currentCrontab.split('\n').filter(line => !line.includes('certbot renew'));
      const newCrontab = lines.join('\n');
      await execPromise(`echo "${newCrontab}" | crontab -`);
      
      return {
        success: true,
        message: '自动续订已关闭'
      };
    }
  } catch (error) {
    console.error('Set auto-renew error:', error.message);
    return {
      success: false,
      error: '设置自动续订失败: ' + error.message
    };
  }
}

/**
 * 旧的函数保持兼容性
 */
async function renewCertificate() {
  return renewSSL();
}

async function getCertificateInfo() {
  return getSSLStatus();
}

module.exports = {
  getSSLStatus,
  renewSSL,
  setAutoRenew,
  renewCertificate,
  getCertificateInfo
};

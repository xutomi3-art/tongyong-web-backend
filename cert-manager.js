// SSL证书管理模块
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * 续期SSL证书
 * @returns {Promise<Object>} 续期结果
 */
async function renewCertificate() {
  try {
    // 尝试使用certbot续期
    const { stdout, stderr } = await execPromise('certbot renew --dry-run');
    
    return {
      success: true,
      message: '证书续期测试成功',
      output: stdout
    };
  } catch (error) {
    console.error('Certificate renewal error:', error.message);
    return {
      success: false,
      message: '证书续期失败: ' + error.message,
      error: error.stderr || error.message
    };
  }
}

/**
 * 获取证书信息
 * @returns {Promise<Object>} 证书信息
 */
async function getCertificateInfo() {
  try {
    // 尝试获取证书信息
    const { stdout } = await execPromise('certbot certificates');
    
    return {
      success: true,
      message: '证书信息获取成功',
      info: stdout
    };
  } catch (error) {
    console.error('Get certificate info error:', error.message);
    return {
      success: false,
      message: '获取证书信息失败: ' + error.message,
      error: error.stderr || error.message
    };
  }
}

module.exports = {
  renewCertificate,
  getCertificateInfo
};

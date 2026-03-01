// 飞书集成模块
const axios = require('axios');

/**
 * 发送消息到飞书机器人
 * @param {string} webhookUrl - 飞书webhook URL
 * @param {Object} message - 消息内容
 * @returns {Promise<boolean>} 是否发送成功
 */
async function sendToFeishuBot(webhookUrl, message) {
  if (!webhookUrl) {
    console.log('未配置飞书Webhook，跳过发送');
    return false;
  }

  try {
    const response = await axios.post(webhookUrl, {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: message.title || '新消息通知'
          },
          template: 'blue'
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: message.content || ''
            }
          }
        ]
      }
    });

    if (response.data.StatusCode === 0 || response.data.code === 0) {
      console.log('✓ 飞书消息发送成功');
      return true;
    } else {
      console.error('飞书消息发送失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('发送到飞书失败:', error.message);
    return false;
  }
}

/**
 * 同步数据到飞书表格
 * @param {Object} config - 配置信息
 * @param {Object} data - 要同步的数据
 * @returns {Promise<boolean>} 是否同步成功
 */
async function syncToFeishuTable(config, data) {
  // 支持两种配置结构：嵌套和扁平
  const feishuConfig = config.feishuConfig || {};
  const appId = config.feishuAppId || feishuConfig.appId;
  const appSecret = config.feishuAppSecret || feishuConfig.appSecret;
  const tableUrl = config.feishuTableUrl || feishuConfig.tableUrl;
  const tableId = feishuConfig.tableId;
  const tableSheetId = feishuConfig.tableSheetId;
  
  // 如果没有tableId，尝试从tableUrl中提取
  let baseId = tableId;
  let sheetId = tableSheetId;
  
  if (!baseId && tableUrl) {
    // 从URL中提取base ID和table ID
    // URL格式: https://xxx.feishu.cn/base/{baseId}?table={tableId}&view={viewId}
    const baseMatch = tableUrl.match(/\/base\/([^?]+)/);
    const tableMatch = tableUrl.match(/[?&]table=([^&]+)/);
    
    if (baseMatch) baseId = baseMatch[1];
    if (tableMatch) sheetId = tableMatch[1];
  }
  
  if (!appId || !appSecret || !baseId || !sheetId) {
    console.log('飞书表格配置不完整，跳过同步');
    console.log('appId:', appId ? '已配置' : '未配置');
    console.log('appSecret:', appSecret ? '已配置' : '未配置');
    console.log('baseId:', baseId || '未配置');
    console.log('sheetId:', sheetId || '未配置');
    return false;
  }

  try {
    // 获取tenant_access_token
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: appId,
      app_secret: appSecret
    });

    if (tokenResponse.data.code !== 0) {
      throw new Error('获取飞书access token失败: ' + tokenResponse.data.msg);
    }

    const accessToken = tokenResponse.data.tenant_access_token;

    // 添加记录到表格
    const recordResponse = await axios.post(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${baseId}/tables/${sheetId}/records`,
      {
        fields: {
          '网址': data.url || '',
          '日期': data.timestamp || data.submittedAt || new Date().toISOString(),
          '姓名': data.name || '',
          '公司/学校/机构': data.school || data.company || '',
          '手机号码': data.phone || '',
          '电子邮箱': data.email || '',
          '咨询需求': data.message || '',
          '来源': data.source || 'website',
          '客户端类型': data.deviceType || '未知'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (recordResponse.data.code === 0) {
      console.log('✓ 同步到飞书表格成功');
      return true;
    } else {
      throw new Error('同步失败: ' + JSON.stringify(recordResponse.data));
    }

  } catch (error) {
    console.error('同步到飞书表格失败:', error.response?.data || error.message);
    return false;
  }
}

module.exports = {
  sendToFeishuBot,
  syncToFeishuTable
};

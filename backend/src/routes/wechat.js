const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const router = express.Router();

// 微信配置
const WECHAT_CONFIG = {
  appId: process.env.WECHAT_APP_ID,
  appSecret: process.env.WECHAT_APP_SECRET
};

// 获取访问令牌
let accessTokenCache = {
  token: null,
  expiresAt: 0
};

async function getAccessToken() {
  if (accessTokenCache.token && Date.now() < accessTokenCache.expiresAt) {
    return accessTokenCache.token;
  }

  try {
    const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
      params: {
        grant_type: 'client_credential',
        appid: WECHAT_CONFIG.appId,
        secret: WECHAT_CONFIG.appSecret
      }
    });

    const { access_token, expires_in } = response.data;
    
    accessTokenCache = {
      token: access_token,
      expiresAt: Date.now() + (expires_in - 300) * 1000 // 提前5分钟过期
    };

    return access_token;
  } catch (error) {
    console.error('获取微信访问令牌失败:', error);
    throw new Error('获取微信访问令牌失败');
  }
}

// 获取 JS-SDK 票据
let jsapiTicketCache = {
  ticket: null,
  expiresAt: 0
};

async function getJSAPITicket() {
  if (jsapiTicketCache.ticket && Date.now() < jsapiTicketCache.expiresAt) {
    return jsapiTicketCache.ticket;
  }

  try {
    const accessToken = await getAccessToken();
    const response = await axios.get('https://api.weixin.qq.com/cgi-bin/ticket/getticket', {
      params: {
        access_token: accessToken,
        type: 'jsapi'
      }
    });

    const { ticket, expires_in } = response.data;
    
    jsapiTicketCache = {
      ticket,
      expiresAt: Date.now() + (expires_in - 300) * 1000 // 提前5分钟过期
    };

    return ticket;
  } catch (error) {
    console.error('获取 JSAPI 票据失败:', error);
    throw new Error('获取 JSAPI 票据失败');
  }
}

// 生成签名
function generateSignature(ticket, nonceStr, timestamp, url) {
  const string = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  return crypto.createHash('sha1').update(string).digest('hex');
}

// 生成随机字符串
function generateNonceStr() {
  return Math.random().toString(36).substr(2, 15);
}

// JS-SDK 配置接口
router.post('/js-config', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: 'URL 参数缺失' });
    }

    const ticket = await getJSAPITicket();
    const nonceStr = generateNonceStr();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(ticket, nonceStr, timestamp, url);

    res.json({
      appId: WECHAT_CONFIG.appId,
      timestamp,
      nonceStr,
      signature
    });
  } catch (error) {
    console.error('生成 JS-SDK 配置失败:', error);
    res.status(500).json({ message: '生成 JS-SDK 配置失败' });
  }
});

// 获取微信授权 URL
router.post('/oauth-url', (req, res) => {
  try {
    const { scope = 'snsapi_userinfo', redirectUri, state } = req.body;
    
    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?` +
      `appid=${WECHAT_CONFIG.appId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${scope}&` +
      `state=${state}#wechat_redirect`;

    res.json({ authUrl });
  } catch (error) {
    console.error('生成授权 URL 失败:', error);
    res.status(500).json({ message: '生成授权 URL 失败' });
  }
});

// 微信授权回调处理
router.post('/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: '授权码缺失' });
    }

    // 通过 code 获取 access_token
    const tokenResponse = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
      params: {
        appid: WECHAT_CONFIG.appId,
        secret: WECHAT_CONFIG.appSecret,
        code,
        grant_type: 'authorization_code'
      }
    });

    const { access_token, openid, refresh_token } = tokenResponse.data;

    // 获取用户信息
    const userResponse = await axios.get('https://api.weixin.qq.com/sns/userinfo', {
      params: {
        access_token,
        openid,
        lang: 'zh_CN'
      }
    });

    const wechatUser = userResponse.data;

    // 查找或创建用户
    const User = require('../models/User');
    let user = await User.findOne({ where: { wechatOpenId: openid } });

    if (!user) {
      // 自动注册新用户
      user = await User.create({
        wechatOpenId: openid,
        wechatUnionId: wechatUser.unionid,
        wechatNickname: wechatUser.nickname,
        wechatAvatar: wechatUser.headimgurl,
        username: `wx_${openid.substr(-8)}`,
        loginType: 'wechat',
        tokenBalance: 100 // 新用户赠送代币
      });
    } else {
      // 更新用户信息
      await user.update({
        wechatNickname: wechatUser.nickname,
        wechatAvatar: wechatUser.headimgurl
      });
    }

    // 生成 JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        wechatNickname: user.wechatNickname,
        wechatAvatar: user.wechatAvatar,
        tokenBalance: user.tokenBalance
      }
    });
  } catch (error) {
    console.error('微信登录回调处理失败:', error);
    res.status(500).json({ message: '登录失败' });
  }
});

// 在现有代码后添加以下接口

// 存储二维码登录状态的内存缓存
const qrLoginCache = new Map();

// 生成二维码登录
router.post('/qr-login', async (req, res) => {
  try {
    // 生成唯一的场景值
    const scene = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建二维码URL（这里使用第三方二维码生成服务）
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/wechat-qr-scan?scene=${scene}`)}`;
    
    // 在缓存中存储场景值和状态
    qrLoginCache.set(scene, {
      status: 'waiting', // waiting, scanned, confirmed, expired
      createdAt: Date.now(),
      token: null,
      user: null
    });
    
    // 设置5分钟后自动过期
    setTimeout(() => {
      if (qrLoginCache.has(scene)) {
        qrLoginCache.set(scene, {
          ...qrLoginCache.get(scene),
          status: 'expired'
        });
      }
    }, 300000); // 5分钟
    
    res.json({
      qrCodeUrl,
      scene,
      message: '二维码生成成功'
    });
  } catch (error) {
    console.error('生成二维码失败:', error);
    res.status(500).json({ message: '生成二维码失败' });
  }
});

// 检查二维码扫描状态
router.get('/qr-status/:scene', (req, res) => {
  try {
    const { scene } = req.params;
    
    if (!scene || scene === 'undefined') {
      return res.status(400).json({ 
        status: 'error',
        message: '场景值无效' 
      });
    }
    
    const loginData = qrLoginCache.get(scene);
    
    if (!loginData) {
      return res.json({
        status: 'expired',
        message: '二维码已过期或不存在'
      });
    }
    
    // 检查是否过期（5分钟）
    if (Date.now() - loginData.createdAt > 300000) {
      qrLoginCache.set(scene, {
        ...loginData,
        status: 'expired'
      });
      return res.json({
        status: 'expired',
        message: '二维码已过期'
      });
    }
    
    res.json({
      status: loginData.status,
      token: loginData.token,
      user: loginData.user,
      message: getStatusMessage(loginData.status)
    });
  } catch (error) {
    console.error('检查二维码状态失败:', error);
    res.status(500).json({ 
      status: 'error',
      message: '检查状态失败' 
    });
  }
});

// 二维码扫描确认接口（供微信扫码后调用）
router.post('/qr-confirm', async (req, res) => {
  try {
    const { scene, code } = req.body;
    
    if (!scene || !code) {
      return res.status(400).json({ message: '参数缺失' });
    }
    
    const loginData = qrLoginCache.get(scene);
    
    if (!loginData || loginData.status === 'expired') {
      return res.status(400).json({ message: '二维码已过期' });
    }
    
    // 更新状态为已扫描
    qrLoginCache.set(scene, {
      ...loginData,
      status: 'scanned'
    });
    
    // 处理微信授权码，获取用户信息
    try {
      // 通过 code 获取 access_token
      const tokenResponse = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
        params: {
          appid: WECHAT_CONFIG.appId,
          secret: WECHAT_CONFIG.appSecret,
          code,
          grant_type: 'authorization_code'
        }
      });

      const { access_token, openid } = tokenResponse.data;

      // 获取用户信息
      const userResponse = await axios.get('https://api.weixin.qq.com/sns/userinfo', {
        params: {
          access_token,
          openid,
          lang: 'zh_CN'
        }
      });

      const wechatUser = userResponse.data;

      // 查找或创建用户
      const User = require('../models/User');
      let user = await User.findOne({ where: { wechatOpenId: openid } });

      if (!user) {
        // 自动注册新用户
        user = await User.create({
          wechatOpenId: openid,
          wechatUnionId: wechatUser.unionid,
          wechatNickname: wechatUser.nickname,
          wechatAvatar: wechatUser.headimgurl,
          username: `wx_${openid.substr(-8)}`,
          loginType: 'wechat',
          tokenBalance: 100 // 新用户赠送代币
        });
      } else {
        // 更新用户信息
        await user.update({
          wechatNickname: wechatUser.nickname,
          wechatAvatar: wechatUser.headimgurl
        });
      }

      // 生成 JWT token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // 更新登录状态为已确认
      qrLoginCache.set(scene, {
        ...loginData,
        status: 'confirmed',
        token,
        user: {
          id: user.id,
          username: user.username,
          wechatNickname: user.wechatNickname,
          wechatAvatar: user.wechatAvatar,
          tokenBalance: user.tokenBalance
        }
      });

      res.json({
        message: '登录确认成功',
        status: 'confirmed'
      });
    } catch (authError) {
      console.error('微信授权处理失败:', authError);
      res.status(500).json({ message: '授权处理失败' });
    }
  } catch (error) {
    console.error('二维码确认失败:', error);
    res.status(500).json({ message: '确认失败' });
  }
});

// 获取状态消息
function getStatusMessage(status) {
  switch (status) {
    case 'waiting':
      return '等待扫描';
    case 'scanned':
      return '已扫描，请在手机上确认';
    case 'confirmed':
      return '登录成功';
    case 'expired':
      return '二维码已过期';
    default:
      return '未知状态';
  }
}

module.exports = router;
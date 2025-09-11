const Joi = require('joi');

/**
 * 验证JS-SDK配置参数
 */
const validateJSConfigParams = (req, res, next) => {
  const schema = Joi.object({
    url: Joi.string().uri().required().messages({
      'string.uri': 'URL格式不正确',
      'any.required': 'URL参数必填'
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  next();
};

/**
 * 验证OAuth参数
 */
const validateOAuthParams = (req, res, next) => {
  const schema = Joi.object({
    scope: Joi.string().valid('snsapi_base', 'snsapi_userinfo').default('snsapi_base'),
    state: Joi.string().optional(),
    redirectUri: Joi.string().uri().required().messages({
      'string.uri': 'redirectUri格式不正确',
      'any.required': 'redirectUri参数必填'
    })
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  req.body = value;
  next();
};

/**
 * 验证认证参数
 */
const validateAuthParams = (req, res, next) => {
  const schema = Joi.object({
    code: Joi.string().required().messages({
      'any.required': '授权码必填'
    }),
    state: Joi.string().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  next();
};

module.exports = {
  validateJSConfigParams,
  validateOAuthParams,
  validateAuthParams
};
const speakeasy = require('speakeasy');
const authService = require('@services/auth');
const userService = require('@services/user');
const { encryptWithAES256, decryptWithAES256 } = require('@utils/crypto');
const { getEncryptedPassword } = require('@utils/bcrypt');
const { emailController } = require('@controllers/email');

const userController = {
  async signUp(req, res, next) {
    let userInfo = {
      email: req.body.email,
      name: req.body.name,
      birth: req.body.birth,
      phone: req.body.phone,
    };
    const { id, password } = req.body;

    try {
      userInfo = encrypUserInfo({ userInfo });
      const secretKey = makeSecretKey();
      const url = makeURL({ secretKey });
      const encryptPassword = await getEncryptedPassword(password);
      const insertResult = await userService.insert({ userInfo, next });
      const result = await authService.insert({
        idx: insertResult.dataValues.idx,
        id,
        password: encryptPassword,
        state: '0',
        secretKey: secretKey.base32,
        next,
      });
      emailController.SignUpAuthentication(req.body.email, req.body.name, insertResult.dataValues.idx);
      res.json({ result, url });
    } catch (e) {
      next(e);
    }
  },

  async dupEmail(req, res, next) {
    const email = encryptWithAES256({ Text: req.body.email });
    try {
      const result = await userService.check({ email, next });
      res.json({ result });
    } catch (e) {
      next(e);
    }
  },

  async confirmEmail(req, res, next) {
    const user = decryptWithAES256({ encryptedText: req.query.user }).split(' ');
    const time = user[1];
    const idx = user[2];
    if (time < Date.now()) {
      res.status(400).json({ result: false });
      return;
    }
    const info = {
      state: 1,
      idx,
    };
    try {
      await authService.update({ info, next });
      res.json({ result: true });
    } catch (e) {
      next(e);
    }
  },

  async findID(req, res, next) {
    const { email, name } = req.body;
    // let userIdx = '';

    const userInfo = encrypUserInfo({ userInfo: req.body });
    try {
      const user = await userService.findAuthByUser({ userInfo });
      if (!user) {
        // 유저 없음
        res.status(400).json({ msg: '없는 사용자' });
      }
      emailController.sendId(email, name, user.auth.id);
      res.json(true);
    } catch (e) {
      /**
       * @TODO 에러 처리
       */
    }
  },
};

const encrypUserInfo = ({ userInfo }) => {
  Object.keys(userInfo).forEach((key) => {
    userInfo[key] = encryptWithAES256({ Text: userInfo[key] });
  });
  return userInfo;
};

const makeSecretKey = () => {
  const secretKey = speakeasy.generateSecret({
    length: 20,
    name: process.env.SECRETKEYNAME,
    algorithm: process.env.SECRETKEYALGORITHM,
  });
  return secretKey;
};

const makeURL = ({ secretKey }) => {
  const url = speakeasy.otpauthURL({
    secret: secretKey.ascii,
    issuer: 'TOTP',
    label: process.env.SECRETKEYLABEL,
  });
  return url;
};

module.exports = userController;

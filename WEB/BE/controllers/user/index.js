const authService = require('@services/auth');
const userService = require('@services/user');
const { encryptWithAES256, decryptWithAES256 } = require('@utils/crypto');
const { getEncryptedPassword } = require('@utils/bcrypt');
const { emailSender } = require('@/utils/emailSender');
const totp = require('@utils/totp');

const userController = {
  async signUp(req, res) {
    let userInfo = {
      email: req.body.email,
      name: req.body.name,
      birth: req.body.birth,
      phone: req.body.phone,
    };
    const { id, password } = req.body;

    userInfo = encrypUserInfo({ userInfo });
    const secretKey = totp.makeSecretKey();
    const url = totp.makeURL({ secretKey, email: req.body.email });
    const encryptPassword = await getEncryptedPassword(password);
    const insertResult = await userService.insert({ userInfo });
    const result = await authService.insert({
      idx: insertResult.dataValues.idx,
      id,
      password: encryptPassword,
      isVerified: '0',
      secretKey,
    });
    emailSender.SignUpAuthentication(req.body.email, req.body.name, insertResult.dataValues.idx);
    res.json({ result, url });
  },

  async dupEmail(req, res) {
    const email = encryptWithAES256({ Text: req.body.email });
    const result = await userService.check({ email });
    res.json({ result });
  },

  async confirmEmail(req, res) {
    const user = decryptWithAES256({ encryptedText: req.query.user }).split(' ');
    const time = user[1];
    const idx = user[2];
    if (time < Date.now()) {
      res.status(400).json({ result: false });
      return;
    }
    const info = {
      isVerified: 1,
      idx,
    };

    await authService.update({ info });
    res.json({ result: true });
  },

  async findID(req, res) {
    const { email, name } = req.body;
    // let userIdx = '';

    const userInfo = encrypUserInfo({ userInfo: req.body });
    const user = await userService.findAuthByUser({ userInfo });
    if (!user) {
      // 유저 없음
      res.status(400).json({ msg: '없는 사용자' });
    }
    emailSender.sendId(email, name, user.auth.id);
    res.json(true);
  },

  async getUser(req, res) {
    const uid = req.session.key;
    const {
      user: { birth, email, name, phone },
    } = await authService.getUserById({ id: uid });

    res.json({
      user: {
        birth: decryptWithAES256({ encryptedText: birth }),
        email: decryptWithAES256({ encryptedText: email }),
        name: decryptWithAES256({ encryptedText: name }),
        phone: decryptWithAES256({ encryptedText: phone }),
      },
    });
  },

  async updateUser(req, res) {
    const uid = req.session.key;
    const { name, email, phone, birth } = req.body;
    const { user } = await authService.getUserById({ id: uid });

    const userInfo = {
      name: name && encryptWithAES256({ Text: name }),
      email: email && encryptWithAES256({ Text: email }),
      phone: phone && encryptWithAES256({ Text: phone }),
      birth: birth && encryptWithAES256({ Text: birth }),
    };

    await user.update(userInfo);

    res.json({ message: 'ok' });
  },
};

const encrypUserInfo = ({ userInfo }) => {
  Object.keys(userInfo).forEach((key) => {
    userInfo[key] = encryptWithAES256({ Text: userInfo[key] });
  });
  return userInfo;
};

module.exports = userController;

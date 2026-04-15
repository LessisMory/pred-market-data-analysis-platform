jest.mock('../config/env', () => ({
  isProd: true,
  firebase: {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test.appspot.com',
    messagingSenderId: '1234567890',
    appId: 'test-app-id',
    measurementId: '',
  },
}));

jest.mock('../services/firebaseAdmin', () => ({
  firebaseAdminEnabled: jest.fn(),
}));

const authController = require('../controllers/authController');
const { firebaseAdminEnabled } = require('../services/firebaseAdmin');

function makeRes() {
  return {
    json: jest.fn(),
  };
}

describe('authController.getClientConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('disables Firebase in production when Firebase Admin is not configured', () => {
    firebaseAdminEnabled.mockReturnValue(false);
    const res = makeRes();

    authController.getClientConfig({}, res);

    expect(res.json).toHaveBeenCalledWith({
      enabled: false,
      firebase: {
        apiKey: 'test-api-key',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project',
        storageBucket: 'test.appspot.com',
        messagingSenderId: '1234567890',
        appId: 'test-app-id',
        measurementId: '',
      },
      providers: {
        google: false,
      },
    });
  });

  test('enables Firebase in production when Firebase Admin is configured', () => {
    firebaseAdminEnabled.mockReturnValue(true);
    const res = makeRes();

    authController.getClientConfig({}, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        providers: {
          google: true,
        },
      })
    );
  });
});

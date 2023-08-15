import assert from 'assert';

import { SecurityExpress } from '../../index.js';
import express from 'express';
const app = express()
const router = express.Router()

describe('SecurityExpress', function () {
  describe('#setup', function () {
    it('should return -1 when the value is not present', function () {
      app.use(SecurityExpress(router, {}));
    });
  });
});
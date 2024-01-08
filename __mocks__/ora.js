class MockedOra {
  color = 'cyan';
  indent = 2;
  interval = 100;
  spinner = require('cli-spinners').clock;
  text = 'xyz';
  prefixText = 'abc';
  suffixText = '123';
  isSpinning = false;
  isEnabled = true;
  isSilent = false;

  frame() {
    return 'frame';
  }

  clear() {
    return this;
  }

  render() {
    return this;
  }

  start() {
    return this;
  }

  stop() {
    return this;
  }

  succeed() {
    return this;
  }

  fail() {
    return this;
  }

  warn() {
    return this;
  }

  info() {
    return this;
  }

  stopAndPersist() {
    return this;
  }
}

function mockOra() {
  return new MockedOra();
}

module.exports = mockOra;
module.exports.oraPromise = jest.fn().mockImplementation((action) => {
  if (typeof action === 'function') {
    return action(mockOra());
  }

  return action;
});
module.exports.spinners = require('cli-spinners');

export default (function() {
  class WithTimestamp {
    level
    constructor(level) {
      this.level = level
    }
    toString() {
      return `[${this.level} ${(new Date).toISOString()}]`;
    }
  }
  return {
    debug: console.log.bind(console, '%s', new WithTimestamp('DEBUG')),
    error: console.error.bind(console, '%s', new WithTimestamp('ERROR'))
  }
})()

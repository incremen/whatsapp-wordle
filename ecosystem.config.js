module.exports = {
    apps: [{
        name: 'wordle-bot',
        script: 'dist/index.js',
        kill_timeout: 20000,
    }],
};

/* Capture transport only: unchanged owned workflow assertions, low-rate software recording. */
const pp = require('puppeteer-core');
const launch = pp.launch.bind(pp);
pp.launch = async options => {
  const browser = await launch(options);
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => {
    const page = await newPage(...args);
    const record = page.screencast.bind(page);
    page.screencast = options => record({...options, fps:3, quality:18, scale:0.5});
    return page;
  };
  return browser;
};

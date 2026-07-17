const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Capture all network requests and responses
  const requests = [];
  context.on('request', request => {
    requests.push({
      method: request.method(),
      url: request.url(),
      postData: request.postData()
    });
  });

  context.on('response', response => {
    console.log(`[${response.status()}] ${response.request().url()}`);
    if (response.url().includes('/api/')) {
      response.text().then(text => {
        console.log(`Response body: ${text}`);
      });
    }
  });

  const page = await context.newPage();

  // Listen for console messages
  page.on('console', msg => console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`));

  try {
    console.log('Navigating to signup page...');
    await page.goto('http://68.183.101.60:3001?page=signup', { waitUntil: 'networkidle' });

    console.log('Filling signup form...');
    await page.fill('input[type="text"]', 'TestUser' + Date.now());
    const inputs = await page.locator('input[type="email"]').all();
    if (inputs.length > 0) {
      await inputs[0].fill('test' + Date.now() + '@example.com');
    }

    const passwordInputs = await page.locator('input[type="password"]').all();
    if (passwordInputs.length >= 2) {
      await passwordInputs[0].fill('TestPassword123!');
      await passwordInputs[1].fill('TestPassword123!');
    }

    console.log('Clicking Create Account button...');
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(3000);

    console.log('Taking screenshot...');
    await page.screenshot({ path: 'signup-result.png' });

    // Check for error message
    const errorText = await page.locator('text=Signup failed').isVisible();
    const successText = await page.locator('text=Welcome back').isVisible();

    console.log(`Error visible: ${errorText}`);
    console.log(`Success visible: ${successText}`);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();

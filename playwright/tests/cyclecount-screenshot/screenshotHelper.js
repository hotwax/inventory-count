//It stores a reusable function that: Opens a URL, Takes a screenshot, Saves it.

//export → allows other files to use this function and async → required because Playwright actions are async

export async function captureScreenshot(page, url, screenshotName) {
  // Step 1: Go to the page
  // Opens the URL, Waits until network calls are done and Ensures page is fully loaded
  await page.goto(url, { waitUntil: "networkidle" });

  await page.waitForTimeout(3000); // Wait for 2 seconds to ensure page stability

  // Parameter:	  What it is	and Who provides it
  //page:      	  Playwright page object	Playwright test
  //url:       	  Page URL	From array
  //screenshotName: File name	From array

  // Step 2: Take screenshot

  // Saves screenshot in /screenshots and fullPage: true → captures full scroll

  await page.screenshot({
    path: `screenshots/${screenshotName}`,
    fullPage: true,
  });
}

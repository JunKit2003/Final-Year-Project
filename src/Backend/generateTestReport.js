import fs from "fs";
import puppeteer from "puppeteer";
import path from "path"; // Add this for filename extraction

async function generatePDFReport() {
  const testResults = JSON.parse(fs.readFileSync("unit-test-results.json", "utf-8"));

  let htmlContent = `
    <html>
    <head>
      <title>Unit Test Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; }
        .test-file { margin-bottom: 20px; }
        .test { padding: 5px; border-bottom: 1px solid #ddd; }
        .passed { color: green; font-weight: bold; }
        .failed { color: red; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Unit Test Report</h1>
  `;

  testResults.testResults.forEach((testFile) => {
    const fileName = path.basename(testFile.name); // Extract only `authenticate.js`
    htmlContent += `<div class='test-file'><h2>${fileName}</h2>`; // Show only file name
    
    testFile.assertionResults.forEach((test) => {
      const statusClass = test.status === "passed" ? "passed" : "failed";
      htmlContent += `<div class='test ${statusClass}'>${test.status.toUpperCase()} - ${test.title}</div>`;
    });

    htmlContent += `</div>`;
  });

  htmlContent += `</body></html>`;

  // Generate PDF
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent);
  await page.pdf({ path: "unit-test-report.pdf", format: "A4" });

  await browser.close();
  console.log("✅ PDF Report generated: unit-test-report.pdf");
}

generatePDFReport();

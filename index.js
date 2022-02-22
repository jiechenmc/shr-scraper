const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const outDir = "outFiles";

const scrape = async (source, option, subject) => {
  const outFileName = `${outDir}/${subject}-${option}.tsv`;
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(source);

  const writeToFile = (data) => {
    let { rank, uni, totalScore, categoryScore } = data;
    let string = `${rank}\t${uni}\t${totalScore}\t${categoryScore}\n`;
    if (fs.existsSync(outFileName)) {
      fs.appendFileSync(outFileName, string);
    } else {
      fs.writeFileSync(outFileName, string);
    }
  };

  const processTable = async () => {
    // Init cheerio
    const data = await page.evaluate(
      () => document.querySelector("*").outerHTML
    );
    const $ = cheerio.load(data);

    // process the data in the table
    const table = $("#content-box > div.rk-table-box > table > tbody > tr");
    table.each((_, element) => {
      let text = $(element).text().split("\n");
      let ranking = text[1].trim();
      let university = text[3].trim();
      let totalScore = text[5].trim();
      let categoryScore = text[7].trim();
      // For debugging: console.log(`${ranking}\t${university}\t${totalScore}\t${categoryScore}`);
      writeToFile({
        rank: ranking,
        uni: university,
        totalScore: totalScore,
        categoryScore: categoryScore,
      });
    });
  };

  const nextPageButton = "#content-box > ul > li.ant-pagination-next";
  const changeScoreSelect =
    "#content-box > div.rk-table-box > table > thead > tr > th:nth-child(5) > div";

  const process = async (op) => {
    let options = {
      Q1: 1,
      CNCI: 2,
      IC: 3,
      TOP: 4,
      AWARD: 5,
    };

    if (op !== "Q1") {
      const scoreOption = `#content-box > div.rk-table-box > table > thead > tr > th:nth-child(5) > div > div.rank-select > div.rk-tooltip > ul > li:nth-child(${options[op]})`;
      await page.click(changeScoreSelect);
      await page.click(scoreOption);
    }
    await processTable();
    await page.click(nextPageButton);
  };

  const lastPage = 17;
  for (let i = 0; i < lastPage; ++i) {
    // Only this and the page to go to has to be modified to reuse Script
    await process(option);
  }
  // close browser
  await browser.close();
};

const cleanDirectory = async () => {
  // directory path
  // check if directory exist

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  // delete directory recursively
  fs.readdir(outDir, (err, files) => {
    if (err) console.log(err);

    for (const file of files) {
      fs.unlink(path.join(outDir, file), (error) => {
        if (err) console.log(error);
      });
    }
  });
};

(async () => {
  let ops = ["Q1", "CNCI", "IC", "TOP", "AWARD"];
  //await cleanDirectory();

  for (const op in ops) {
    scrape(
      "https://www.shanghairanking.com/rankings/gras/2021/RS0208",
      ops[op],
      "Biomedical Engineering"
    );
  }
})();

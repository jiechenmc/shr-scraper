const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const scrape = async (source, option) => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(source);

  const writeToFile = (data, fileName) => {
    let { rank, uni, totalScore, categoryScore } = data;
    let string = `${rank}\t${uni}\t${totalScore}\t${categoryScore}\n`;
    //console.log(total);
    if (fs.existsSync(fileName)) {
      fs.appendFileSync(fileName, string);
    } else {
      fs.writeFileSync(fileName, string);
    }
  };

  const processTable = async (fileName) => {
    // Init cheerio
    const data = await page.evaluate(
      () => document.querySelector("*").outerHTML
    );
    const $ = cheerio.load(data);

    //check current score type
    // should print out the same type 17 types if accurate
    const btn = $(
      "#content-box > div.rk-table-box > table > thead > tr > th:nth-child(5) > div > div.rank-select > div.rk-tooltip > ul > li"
    );
    btn.each((_, element) => {
      let el = $(element);
      if (el.hasClass("select-active")) {
        console.log(el.text());
      }
    });

    // process the data in the table
    const table = $("#content-box > div.rk-table-box > table > tbody > tr");
    table.each((_, element) => {
      let text = $(element).text().split("\n");
      let ranking = text[1].trim();
      let university = text[3].trim();
      let totalScore = text[5].trim();
      let categoryScore = text[7].trim();
      //console.log(totalScore);
      // For debugging: console.log(`${ranking}\t${university}\t${totalScore}\t${categoryScore}`);
      writeToFile(
        {
          rank: ranking,
          uni: university,
          totalScore: totalScore,
          categoryScore: categoryScore,
        },
        fileName
      );
    });
  };

  const processQ1 = async () => {
    await processTable("out/Q1.tsv");
    // go next page
    await page.click("#content-box > ul > li.ant-pagination-next");
  };

  const processCNCI = async () => {
    await page.click(
      "#content-box > div.rk-table-box > table > thead > tr > th:nth-child(5) > div"
    );
    await page.click(
      "#content-box > div.rk-table-box > table > thead > tr > th:nth-child(5) > div > div.rank-select > div.rk-tooltip > ul > li:nth-child(2)"
    );
    await processTable("out/CNCI.tsv");
    await page.click("#content-box > ul > li.ant-pagination-next");
  };

  const processIC = async () => {
    await page.click(
      "#content-box > div.rk-table-box > table > thead > tr > th:nth-child(5) > div"
    );
    await page.click(
      "#content-box > div.rk-table-box > table > thead > tr > th:nth-child(5) > div > div.rank-select > div.rk-tooltip > ul > li:nth-child(3)"
    );
    await processTable("out/IC.tsv");
    await page.click("#content-box > ul > li.ant-pagination-next");
  };

  const processTOP = async () => {
    await page.click(
      "#content-box > div.rk-table-box > table > thead > tr > th:nth-child(5) > div"
    );
    await page.click(
      "#content-box > div.rk-table-box > table > thead > tr > th:nth-child(5) > div > div.rank-select > div.rk-tooltip > ul > li:nth-child(4)"
    );
    await processTable("out/TOP.tsv");
    await page.click("#content-box > ul > li.ant-pagination-next");
  };

  const processAward = async () => {
    await page.click(
      "#content-box > div.rk-table-box > table > thead > tr > th:nth-child(5) > div"
    );
    await page.click(
      "#content-box > div.rk-table-box > table > thead > tr > th:nth-child(5) > div > div.rank-select > div.rk-tooltip > ul > li:nth-child(5)"
    );
    await processTable("out/Award.tsv");
    await page.click("#content-box > ul > li.ant-pagination-next");
  };

  let lastPage = 17;

  let options = {
    Q1: processQ1,
    CNCI: processCNCI,
    IC: processIC,
    TOP: processTOP,
    AWARD: processAward,
  };

  for (let i = 0; i < lastPage; ++i) {
    // Only this and the page to go to has to be modified to reuse Script
    await options[option]();
  }
  // close browser
  await browser.close();
};

const cleanDirectory = async () => {
  // directory path
  const directory = "out";

  // delete directory recursively
  fs.readdir(directory, (err, files) => {
    if (err) console.log(err);

    for (const file of files) {
      fs.unlink(path.join(directory, file), (err) => {
        if (err) console.log(err);
      });
    }
  });
};

(async () => {
  let ops = ["Q1", "CNCI", "IC", "TOP", "AWARD"];
  await cleanDirectory();

  for (const op in ops) {
    scrape(
      "https://www.shanghairanking.com/rankings/gras/2021/RS0102",
      ops[op]
    );
  }
})();

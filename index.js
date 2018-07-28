const request = require("requestretry").defaults({
  //  fullResponse: false,
});
// const request = require("request-promise");
const cheerio = require("cheerio");
const ObjectsToCsv = require("objects-to-csv");

const url = "https://sfbay.craigslist.org/d/software-qa-dba-etc/search/sof";

const scrapeSample = {
  title: "Technical Autonomous Vehicle Trainer",
  description:
    "We're the driverless car company. We're building the world's best autonomous vehicles to safely connect people to the places, things, and experiences they care about.",
  datePosted: new Date("2018-07-13"),
  url:
    "https://sfbay.craigslist.org/sfc/sof/d/technical-autonomous-vehicle/6642626746.html",
  hood: "(SOMA / south beach)",
  address: "1201 Bryant St.",
  compensation: "23/hr"
};

const scrapeResults = [];

async function scrapeJobHeader() {
  try {
    const htmlResult = await request.get(url);
    const $ = await cheerio.load(htmlResult.body);

    $(".result-info").each((index, element) => {
      const resultTitle = $(element).children(".result-title");
      const title = resultTitle.text();
      const url = resultTitle.attr("href");
      const datePosted = $(element)
        .children("time")
        .attr("datetime");

      const hood = $(element)
        .find(".result-hood")
        .text();
      const scrapeResult = { title, url, datePosted, hood };
      scrapeResults.push(scrapeResult);
    });
    return scrapeResults;
  } catch (err) {
    console.error(err);
  }
}

async function scrapeDescription(jobsWithHeaders) {
  return await Promise.all(
    jobsWithHeaders.map(async (job, index) => {
      try {
        const htmlResult = await request.get(job.url);
        const $ = await cheerio.load(htmlResult.body);
        console.log(htmlResult.attempts);
        console.log("job " + index);
        $(".print-qrcode-container").remove();
        job.description = $("#postingbody").text();
        job.address = $("div.mapaddress").text();
        const compensationText = $(".attrgroup")
          .children()
          .first()
          .text();
        job.compensation = compensationText.replace("compensation: ", "");
        return job;
      } catch (error) {
        console.error(error);
      }
    }),
    { concurrency: 10 }
  );
}

async function scrapeDescriptionNotConcurrent(jobsWithHeaders) {
  console.log(jobsWithHeaders);
  for (var i = 0; i < jobsWithHeaders.length; i++) {
    try {
      let job = jobsWithHeaders[i];
      const htmlResult = await request.get(job.url);
      console.log("job " + i);

      const $ = await cheerio.load(htmlResult.body);
      $(".print-qrcode-container").remove();
      job.description = $("#postingbody").text();
      job.address = $("div.mapaddress").text();
      const compensationText = $(".attrgroup")
        .children()
        .first()
        .text();
      job.compensation = compensationText.replace("compensation: ", "");
    } catch (error) {
      console.error(error);
    }
  }
  return jobsWithHeaders;
}

async function createCsvFile(data) {
  let csv = new ObjectsToCsv(data);

  // Save to file:
  await csv.toDisk("./test.csv");
}

async function scrapeCraigslist() {
  try {
    const jobsWithHeaders = await scrapeJobHeader();
    const jobsFullData = await scrapeDescription(jobsWithHeaders);
    console.log(jobsFullData.length);
    await createCsvFile(jobsFullData);
  } catch (error) {
    console.error(error);
  }
}

scrapeCraigslist();

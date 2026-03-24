function getProfileData() {
  const name = document.querySelector("h1")?.innerText;
  const headline = document.querySelector(".text-body-medium")?.innerText;

  const experiences = Array.from(document.querySelectorAll("li"))
    .slice(0, 5)
    .map((element) => element.innerText);

  return { name, headline, experiences };
}

console.info("[LinkedIn Analyzer] Content script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_PROFILE") {
    const profile = getProfileData();
    console.info("[LinkedIn Analyzer] GET_PROFILE received", profile);
    sendResponse(profile);
  }
});

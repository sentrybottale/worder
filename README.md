Dockerized Node.js Wordlist Analysis Service

This project offers a Dockerized service featuring two primary API endpoints designed to perform complex word analysis tasks:

Upload a Wordlist: This endpoint allows users to upload a .txt file containing a list of words. The service then processes each word to identify all possible subsequences that are also present in the provided wordlist, considering a specified word length.
Crawl Words from URL: This endpoint crawls the textual content of a specified URL, extracts words, and compares them against a provided wordlist to identify valid subsequences.
Word Analysis Logic

Subsequence Definition
A "subsequence" of a word refers to a sequence that can be derived from the original word by deleting some or no characters without changing the order of the remaining characters. For example, "win" is a subsequence of "window" but "wdw" is not.

Valid Subsequence Criteria
A subsequence is considered "valid" if it meets the following criteria:

It is a part of the provided wordlist.
For the /api/upload endpoint, it matches the specified wordLength.
For the /api/crawl endpoint, it is found within the crawled content and matches the specified wordLength.
It retains the character order of the original word.
API Endpoints
The final 1 character word is either A or I

1. Upload a Wordlist
Endpoint: /api/upload
Functionality: Users upload a wordlist. The service then analyzes each word to find valid subsequences that match a specified length and are contained within the wordlist itself.
Parameters
wordlist: A .txt file upload containing the wordlist.
wordLength (query parameter): Specifies the length of words to be analyzed from the wordlist.
2. Crawl Words from URL
Endpoint: /api/crawl
Functionality: The service crawls the specified URL for words, compares them against the provided wordlist, and identifies valid subsequences.
Parameters
wordlist: A .txt file upload containing the wordlist.
url (form-data field): The target URL to crawl for words.
wordLength (form-data field): Specifies the desired length for subsequence analysis.
Testing with Postman

To test the endpoints using Postman, set the method to POST and use the respective URLs: http://localhost:3000/api/upload?wordLength=<desired_length> for the /api/upload endpoint and http://localhost:3000/api/crawl for the /api/crawl endpoint. For /api/crawl, include the url and wordLength as form-data fields along with the wordlist file upload.
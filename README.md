Dockerized Node.js Wordlist Analysis Service

This project provides a Dockerized service with enhanced capabilities for performing complex word analysis tasks. It features API endpoints for uploading wordlists and crawling textual content from specified URLs to identify valid subsequences within a given wordlist.

Word Analysis Logic as originally described:
https://www.republicworld.com/initiatives/what-9-letter-word-is-still-a-word-after-removing-one-letter-each-time/

Subsequence Definition
A "subsequence" of a word is a sequence that can be derived from the original word by deleting some or no characters without altering the order of the remaining characters. For instance, "win" is a subsequence of "window", whereas "wdw" is not.

Valid Subsequence Criteria
A subsequence is deemed "valid" if it meets the following criteria:

It is included in the provided wordlist.
It complies with the specified word length.
It maintains the character order of the original word.
The final 1-character word in any valid sequence must be either 'A' or 'I'.
API Endpoints

Upload a Wordlist
Endpoint: /api/upload
Functionality: This endpoint allows for the upload of a wordlist or the provision of a wordlist URL. The service analyzes each word to find valid subsequences that match a specified length and are part of the wordlist.
Parameters:
wordlist: A .txt file containing the wordlist (for file upload).
url: The URL from which to fetch the wordlist (as a JSON body field, alternative to file upload).
wordLength (query parameter): Specifies the length of words to be analyzed from the wordlist.
Crawl Words from URL
Endpoint: /api/crawl
Functionality: The service crawls the specified URL for words, compares them against the provided wordlist, and identifies valid subsequences.
Parameters:
wordlist: A .txt file containing the wordlist (for file upload).
url (form-data field): The target URL to crawl for words.
wordLength (form-data field): Specifies the desired length for subsequence analysis.

Testing with Postman. To test the endpoints using Postman, set the method to POST and use the respective URLs:

For the /api/upload endpoint, use http://localhost:3000/api/upload?wordLength=<desired_length>. You can either attach a wordlist file or provide a wordlist URL in the request body as JSON (e.g., {"url": "http://example.com/wordlist.txt"}).
For the /api/crawl endpoint, use http://localhost:3000/api/crawl. Include the url and wordLength as form-data fields along with the wordlist file upload, if using file upload.
This updated README reflects the latest functionalities of your service, including the new option to accept a wordlist from a URL and the clarified word analysis logic. Make sure to adjust any specific instructions or URLs to fit your actual service configuration and endpoint definitions.

# The OpenPDS Project

The OpenPDS Project will be a collection of tools for creating and sharing information 
through the Authenticated Transfer (AT) Protocol.

Right now there is only _one_ tool, the Articles editor, and it's in development.

**Alpha features**: 
- [X] User authentication
- [X] If user does not have `org.openpds.defs` in PDS, prompts on login
- [X] Create local article and sync with browser's IDB
- [X] Update local article and sync with browser's IDB
- [X] Published local article to PDS (writes new `org.openpds.article` to PDS)
- [X] If local version is different from PDS version of article, presents
      sync conflict opportunity resolution 
- [X] Delete local article deletes PDS article

**Alpha bugs**
- Check the issues for a list of outstanding todos

* This project is still _very young_, and as such, I may be refactoring it to accommodate 
  new tools and functionality in the future. 
* Unless you are interested in contributing to development, I don't recommend you use 
  this yet.

## Stable
* (none yet)

## Open Alpha (expect some changes)

### OpenPDS Articles Editor

* **Goal**: Create a public repository of markdown files that I can 
  use as a source of truth for a programmatically generated 
  static site blog (Hugo, Zola, Jekyll, Eleventy, etc).

## Contributing

This project is very small, just getting started, and actively open to feedback, 
ideas, contributions, and comments. PRs are welcome. 

The project is built with Vue3 + Vite + TypeScript. 

## License 

All of the tools and text provided and published by The OpenPDS Project are licensed 
under GPLv3. 


# The OpenPDS Project

The OpenPDS Project is a collection of tools for creating and sharing information 
through the Authenticated Transfer (AT) Protocol.

Right now there is only _one_ tool, the Articles editor, and it's in development.

**Current status**: 
* As of January 2025, about 80% of the Articles editor functionality has been created.
* This project is still _very young_, and as such, I may be refactoring it to accommodate 
  new tools and functionality in the future. 
* Unless you are interested in contributing to development, I don't recommend you use 
  this yet.

**How it works**

* With the AT Protocol, user data is provided via Personal Data Repositories (PDSs). 
* OpenPDS hosts free and open-source tools for registering and manipulating
artifacts in your PDS. 
* Artifacts are described by **Lexicons**, which are schematic representations
of data relevant to the AT Protocol. 

## Stable
* (none yet)

## Open Beta (expect some changes)

### OpenPDS Articles Editor (`openpds.org/articles`)

## Backlog

**New artifact editors:**
* BlueSky Posts (`openpds.org/app.bsky.feed.post`) ?
* Recipes (`openpds.org/recipes`) (soliciting ideas)
* Lists (`openpds.org/lists`) (soliciting ideas)

**New Services:**
* **OpenPDS Pages**. A public, rendered HTML version of OpenPDS Articles 
  with customizable style and script tags. 

## Contributing

This project is very small, just getting started, and actively open to feedback, 
ideas, contributions, and comments. PRs are welcome. 

## License 

All of the tools and text provided and published by The OpenPDS Project are licensed 
under GPLv3. 

# OpenPDS Article Editor

The [Article Editor](https://openpds.org/articles) is for editing `org.openpds.article` artifacts. 

## Notes on article syncing

The sync functionality warrants its own store for a few reasons. The first is domain separation. 
Syncing represents a distinct domain concern from editing (PDS interactions, conflict resolution, 
sync status tracking, etc). Then there is state management. Syncing has its own state (syncing status, 
errors) that shouldn't be mixed with editor state (content, local saving, etc). Finally, since sync 
operations may be triggered from multiple places (editor, article list, background jobs), a dedicated 
store makes this functionality reusable. To facilitate this, the domain model separates sync jobs 
(SyncJob type) and media uploads from the core article editing functionality.

The alternative would be putting sync logic in the editor store, but that would violate SRP 
and make the sync functionality harder to maintain and reuse.
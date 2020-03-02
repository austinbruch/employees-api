## Future considerations

* Send back a 409 instead of 400 when a user attempts to create a second employee with CEO role. This would mean the common validation code needs a hook to specify custom status codes. Currently all failed validations return 400s to the client.

* More thorough type checking in various internal modules (I'm accustomed to TypeScript)

* Show more data in the testing UI (quotes, jokes)

* Retry loop for external API calls on failure case

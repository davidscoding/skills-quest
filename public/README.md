This is the read me file for David's Todo Project!

I wanted to use this to explain some of my thoughts and assumptions for the project and user of the app:

1. We are running the server and client from the same origin in the same manner as the setup described in the project instructs us. 

2. The final requirement for spec #2 under *Modal Specifications* of the project requirements states that clicking "Saves" closes the modal and that:

> it saves the details that were provided accordingly

We assume here that empty descriptions are not considered details.

3. I didn't see anything that resembled resetting the todo list database in the project description, but I saw it in the API. The first method call in `init` on `line 9` of `.javascripts/todolist.js` is commented out, but if you'd like reset the database with each refresh, all you need to do is uncomment it back in.

4. Using jQuery would have made parts of this a lost easier (especially with the evnt listeners), but I did the practice project with it so I wanted to try switching things up with vanilla JS and the Fetch API.
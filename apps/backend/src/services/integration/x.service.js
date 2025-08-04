import { TwitterApi } from "twitter-api-v2";
import { Object } from "../../models/lib/object.model.js"
import { environment } from "../../loaders/environment.loader.js";

export const refreshTwitterToken = async (refreshToken) => {
    try {
        const client = new TwitterApi({
            clientId: environment.X_CLIENT_ID,
            clientSecret: environment.X_CLIENT_SECRET
        });

        const { accessToken, refreshToken: newRefreshToken, expiresIn } =
            await client.refreshOAuth2Token(refreshToken);

        console.log("New Access Token:", accessToken);
        console.log("New Refresh Token:", newRefreshToken);
        console.log("Expires In:", expiresIn, "seconds");

        return { accessToken, newRefreshToken };
    } catch (error) {
        console.error("Error refreshing Twitter token:", error);
        throw error;
    }
};

// export const syncXBookmarks = async (accessToken, userId) => {
//     try {
//         const twitterClient = new TwitterApi(accessToken);

//         const bookmarks = await twitterClient.v2.bookmarks({
//             "tweet.fields": ["created_at", "text", "author_id"],
//             max_results: 100
//         });

//         if (!bookmarks || !bookmarks.data.data || bookmarks.data.data.length === 0) {
//             console.log("No bookmarks found.");
//             return [];
//         }

//         for (const tweet of bookmarks.data.data) {
//             const newBookmark = {
//                 user: userId,
//                 id: tweet.id,
//                 title: tweet.text.substring(0, 50) + (tweet.text.length > 50 ? '...' : ''),
//                 description: tweet.text,
//                 source: "twitter",
//                 type: "bookmark",
//                 metadata: {
//                     tweetId: tweet.id,
//                     authorId: tweet.author_id,
//                     text: tweet.text,
//                     url: `https://twitter.com/i/web/status/${tweet.id}`
//                 },
//                 createdAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
//                 updatedAt: new Date()
//             };

//             try {
//                 await Object.findOneAndUpdate(
//                     { id: tweet.id, user: userId },
//                     newBookmark,
//                     { upsert: true, new: true }
//                 );
//             } catch (dbError) {
//                 console.error(`Error saving bookmark ${tweet.id}:`, dbError);
//                 continue;
//             }
//         }

//         console.log(`Successfully saved bookmarks.`);
//     } catch (error) {
//         console.error("Error syncing bookmarks:", error);
//         throw error;
//     }
// };

export const syncXBookmarks = async (accessToken, userId) => {
    try {
        const twitterClient = new TwitterApi(accessToken);

        const bookmarks = await twitterClient.v2.bookmarks({
            "tweet.fields": ["created_at", "text", "author_id"],
            max_results: 100
        });

        if (!bookmarks || !bookmarks.data.data || bookmarks.data.data.length === 0) {
            console.log("No bookmarks found.");
            return [];
        }

        for (const tweet of bookmarks.data.data) {
            const existingBookmark = await Object.findOne({ id: tweet.id, user: userId });

            if (!existingBookmark) {
                // If the bookmark does not exist, create a new one
                const newBookmark = {
                    user: userId,
                    id: tweet.id,
                    title: tweet.text.substring(0, 50) + (tweet.text.length > 50 ? '...' : ''),
                    description: tweet.text,
                    source: "twitter",
                    type: "bookmark",
                    metadata: {
                        tweetId: tweet.id,
                        authorId: tweet.author_id,
                        text: tweet.text,
                        url: `https://twitter.com/i/web/status/${tweet.id}`
                    },
                    createdAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
                    updatedAt: new Date()
                };

                try {
                    await Object.create(newBookmark);
                    console.log(`Created new bookmark for tweet ID ${tweet.id}`);
                } catch (dbError) {
                    console.error(`Error saving new bookmark ${tweet.id}:`, dbError);
                }
            } else {
                // bookmark already exists, update its fields
                try {
                    await Object.updateOne(
                        { id: tweet.id, user: userId },
                        {
                            $set: {
                                title: tweet.text.substring(0, 50) + (tweet.text.length > 50 ? '...' : ''),
                                description: tweet.text,
                                metadata: {
                                    tweetId: tweet.id,
                                    authorId: tweet.author_id,
                                    text: tweet.text,
                                    url: `https://twitter.com/i/web/status/${tweet.id}`
                                },
                                updatedAt: new Date()
                            }
                        }
                    );
                    console.log(`Updated existing bookmark for tweet ID ${tweet.id}`);
                } catch (dbError) {
                    console.error(`Error updating bookmark ${tweet.id}:`, dbError);
                }
            }
        }

        console.log(`Successfully synced bookmarks.`);
    } catch (error) {
        console.error("Error syncing bookmarks:", error);
        throw error;
    }
};

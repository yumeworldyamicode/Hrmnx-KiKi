async function loadKiKiFeed() {

    const feed = document.getElementById("postFeed");

    if (!feed) {
        return;
    }

    feed.innerHTML = `
        <div class="feed-loading">
            Loading KiKi...
        </div>
    `;


    const {
        data: posts,
        error
    } = await supabaseClient
        .from("posts")
        .select(`
            id,
            title,
            content,
            image_url,
            is_staff_post,
            created_at,

	    profiles!posts_author_id_fkey (
	        display_name,
	        username,
	        avatar_url,
	        is_staff
	    ),

            artists (
                name,
                slug
            )
        `)
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "KiKi feed error:",
            error
        );

        feed.innerHTML = `
            <div class="feed-error">
                Unable to load KiKi posts.
            </div>
        `;

        return;
    }


    if (!posts || posts.length === 0) {

        feed.innerHTML = `
            <div class="feed-empty">
                No posts yet.
            </div>
        `;

        return;
    }


    feed.innerHTML = "";


    posts.forEach(post => {

        const profile =
            post.profiles;

        const artist =
            post.artists;


        const displayName =
            profile?.display_name ||
            "KiKi user";


        const artistName =
            artist?.name ||
            "";


        const artistSlug =
            artist?.slug ||
            "";


        const avatar =
            profile?.avatar_url;


        const date =
            new Date(
                post.created_at
            ).toLocaleString();


        const article =
            document.createElement(
                "article"
            );


        article.className =
            "post";


        article.dataset.artist =
            artistName;


        article.dataset.postId =
            post.id;


        /* =========================
           OFFICIAL LABEL
        ========================= */

        const officialLabel =
            post.is_staff_post
                ? `
                    <div class="official-label">

                        <img
                            src="images/Kikifficial.gif"
                            alt="KiKifficial"
                        >

                        <span>
                            KiKifficial
                        </span>

                    </div>
                `
                : "";


        /* =========================
           AUTHOR AVATAR
        ========================= */

        const authorAvatar =
            avatar
                ? `
                    <img
                        src="${escapeHTML(avatar)}"
                        class="artist-avatar-image"
                        alt=""
                    >
                `
                : `
                    <div class="artist-avatar">
                        ${
                            artistName
                                .substring(0, 2)
                                .toUpperCase()
                        }
                    </div>
                `;


        /* =========================
           STAFF BADGE
        ========================= */

        const staffBadge =
            profile?.is_staff
                ? `
                    <img
                        src="images/Kikifficial.gif"
                        class="kikifficial-post-badge"
                        alt="Staff member"
                        title="Staff member"
                    >
                `
                : "";


        article.innerHTML = `

            ${officialLabel}


            <div class="post-header">

                ${authorAvatar}


                <div class="post-author">

                    <strong>
                        ${escapeHTML(displayName)}
                    </strong>

                    ${staffBadge}


                    <span class="post-date">

                        ${
                            post.is_staff_post
                                ? "KiKifficial · "
                                : ""
                        }

                        ${escapeHTML(date)}

                    </span>

                </div>

            </div>


            ${
                artistName
                    ? `
                        <div class="post-artist">

                            ${escapeHTML(artistName)}

                        </div>
                    `
                    : ""
            }


            <h2 class="post-title">

                ${escapeHTML(
                    post.title || ""
                )}

            </h2>


            <p class="post-content">

                ${escapeHTML(
                    post.content || ""
                )}

            </p>


            ${
                post.image_url
                    ? `
                        <img
                            src="${escapeHTML(post.image_url)}"
                            class="post-image"
                            alt=""
                        >
                    `
                    : ""
            }


            <div class="translation-area">

                <div class="translation-controls">

                    <label>
                        Language:
                    </label>

                    <select
                        onchange="translatePost(this)"
                    >

                        <option value="en">
                            English
                        </option>

                        <option value="ja">
                            日本語
                        </option>

                        <option value="ko">
                            한국어
                        </option>

                        <option value="zh">
                            中文
                        </option>

                    </select>

                </div>

            </div>


            <div class="post-actions">

                <button
                    class="reaction-button"
                    onclick="react(this)"
                >

                    ♡

                    <span>
                        0
                    </span>

                </button>


                <button
                    class="comment-button"
                >

                    Comments

                </button>

            </div>

        `;


        feed.appendChild(
            article
        );

    });

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


/* =========================================
   LOAD FEED
========================================= */

loadKiKiFeed();
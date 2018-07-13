/**
 * application constants
 */

var Constants = {
	DEFAULT_BANNER_TIMEOUT: 4500,
	DEFAULT_OVERLAY_TIMEOUT: 5000,
	ERR_CODE_VID_NOTFOUND: 4,
	DEFAULT_SOCKET_PROTO: 'ws',
	DEFAULT_SOCKET_PATH: '/ws',
	DEFAULT_SOCKET_HOST: 'localhost',
	DEFAULT_SOCKET_PORT: 8000,

	STREAM_URL_PREFIX: '/s/',

	// controls elems
	CTRL_SEEK_TRIGGER: 'controls-container-seek-trigger',

	// overlays container
	OVERLAYS_CONTAINER: 'overlays-container',

	// dom information
	DOM_YT_CONTAINER: 'yt-video',
	DOM_TWITCH_CONTAINER: 'twitch-video',
	DOM_SC_CONTAINER: 'soundcloud-video',

	// server stream api information
	STREAM_KIND_YOUTUBE: 'youtube',
	STREAM_KIND_LOCAL: 'movie',
    STREAM_KIND_SOUNDCLOUD: 'soundcloud',
	STREAM_KIND_TWITCH: 'twitch',
	STREAM_KIND_TWITCH_CLIP: 'twitch#clip',

	// api results information
	YOUTUBE_ITEM_KIND_PLAYLIST_ITEM: 'youtube#playlistItem',
	TWITCH_ITEM_KIND_PLAYLIST_ITEM: 'twitch#playlistItem',
	SOUNDCLOUD_ITEM_KIND_PLAYLIST_ITEM: 'soundcloud#playlistItem',

	YOUTUBE_ITEM_KIND_ITEM: 'youtube#video',
	TWITCH_ITEM_KIND_ITEM: 'twitch#video',
	TWITCH_ITEM_KIND_CLIP: 'twitch#clip',

	// rbac client info
	ROLE_KIND_ADMIN: 'admin'
};

module.exports = Constants;
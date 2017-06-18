/**
 * application constants
 */

var Constants = {
	DEFAULT_BANNER_TIMEOUT: 4500,
	DEFAULT_OVERLAY_TIMEOUT: 5000,
	ERR_CODE_VID_NOTFOUND: 4,
	DEFAULT_SOCKET_PROTO: 'http',
	DEFAULT_SOCKET_PATH: '',
	DEFAULT_SOCKET_HOST: 'localhost',
	DEFAULT_SOCKET_PORT: 8000,

	STREAM_URL_PREFIX: '/s/',

	STREAM_KIND_YOUTUBE: 'youtube',
	STREAM_KIND_LOCAL: 'movie',
	STREAM_KIND_TWITCH: 'twitch'
};

module.exports = Constants;
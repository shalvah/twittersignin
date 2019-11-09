declare function _exports({ consumerKey, consumerSecret, accessToken, accessTokenSecret, }: TwitterAppConfig): {
    getRequestToken: ({ oauth_callback, x_auth_access_type }?: {
        oauth_callback?: string;
        x_auth_access_type?: "read" | "write";
    }) => Promise<{
        oauth_token: string;
        oauth_token_secret: string;
        oauth_callback_confirmed: boolean;
    }>;
    getAccessToken: (requestToken: string, requestTokenSecret: string, oauth_verifier: string) => Promise<{
        oauth_token: string;
        oauth_token_secret: string;
        screen_name: string;
        user_id: string;
    }>;
    getUser: (accessToken: string, accessTokenSecret: string, params?: {
        include_entities?: boolean;
        skip_status?: boolean;
        include_email?: boolean;
    }) => Promise<{
        [x: string]: any;
    } | {
        id_str: string;
        name: string;
        screen_name: string;
        location: string;
        description: string;
        url: string;
        entities: {};
        protected: boolean;
        followers_count: number;
        friends_count: number;
        listed_count: number;
        created_at: string;
        favourites_count: number;
        time_zone: null;
        geo_enabled: boolean;
        verified: boolean;
        statuses_count: number;
        lang: string;
        status: {};
        contributors_enabled: boolean;
        is_translator: boolean;
        is_translation_enabled: null;
        profile_background_color: string;
        profile_background_image_url: string;
        profile_background_image_url_https: string;
        profile_background_tile: null;
        profile_image_url: string;
        profile_image_url_https: string;
        profile_banner_url: string;
        profile_link_color: string;
        profile_sidebar_border_color: string;
        profile_sidebar_fill_color: string;
        profile_text_color: string;
        profile_use_background_image: null;
        has_extended_profile: null;
        default_profile: boolean;
        default_profile_image: boolean;
        following: boolean;
        follow_request_sent: boolean;
        notifications: boolean;
        translator_type: string;
    }>;
};
export = _exports;
export type TwitterAppConfig = {
    consumerKey: string;
    consumerSecret: string;
    accessToken: string;
    accessTokenSecret: string;
};

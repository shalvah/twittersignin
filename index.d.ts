declare function _exports({ consumerKey, consumerSecret, accessToken, accessTokenSecret, }: TwitterAppConfig): {
    getRequestToken: ({ oauth_callback, x_auth_access_type }: {
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
    getUser: (accessToken: string, accessTokenSecret: string, params: {
        include_entities?: boolean;
        skip_status?: boolean;
        include_email?: boolean;
    }) => Promise<{
        id_str: string;
        oauth_token_secret: string;
        screen_name: string;
        user_id: string;
    }>;
};
export = _exports;
export type TwitterAppConfig = {
    consumerKey: string;
    consumerSecret: string;
    accessToken: string;
    accessTokenSecret: string;
};

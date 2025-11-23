import "stream-chat";
declare module "stream-chat" {
  // your "userType" now becomes
  interface CustomUserData {
    email?: string;
  }

  //extending CustomChannelData interface
  interface CustomChannelData {
    name?: string;
  }
}

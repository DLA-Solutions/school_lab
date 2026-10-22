import { NavigatorScreenParams } from '@react-navigation/native';

export type MessagesStackParamList = {
  Inbox: undefined;
  Thread: { conversationId: number };
};

export type BoletosStackParamList = {
  List: undefined;
  Detail: { chargeId: number };
};

export type MainTabParamList = {
  Home: undefined;
  Messages: NavigatorScreenParams<MessagesStackParamList> | undefined;
  Boletos: NavigatorScreenParams<BoletosStackParamList> | undefined;
  Child: undefined;
};

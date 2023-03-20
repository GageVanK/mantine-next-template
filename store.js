import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getUsersStateless, identity, NOTIFICATION_EVENTS } from 'deso-protocol';
import { ThunkAction } from 'redux-thunk';
import { RootState } from './types';

interface UserState {
  currentUser: any;
  alternateUsers: any;
  isLoading: boolean;
}

const initialState: UserState = {
  currentUser: null,
  alternateUsers: null,
  isLoading: true,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCurrentUser(state, action: PayloadAction<any>) {
      state.currentUser = action.payload;
    },
    setAlternateUsers(state, action: PayloadAction<any>) {
      state.alternateUsers = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    initializeUserState(state) {
      state.currentUser = null;
      state.alternateUsers = null;
      state.isLoading = true;
    },
  },
});

const { setCurrentUser, setAlternateUsers, setLoading, initializeUserState } = userSlice.actions;

export const getUserData = (): ThunkAction<void, RootState, null, any> => async (dispatch, getState) => {
  const state = getState().user;
  const currentUser = state.currentUser;
  const alternateUsers = state.alternateUsers;

  if (!currentUser) {
    dispatch(setLoading(true));
    identity.initialize();
  } else if (
    currentUser?.publicKey !== state.currentUser?.PublicKeyBase58Check
  ) {
    const alternateUserKeys =
      Object.values(alternateUsers ?? {})?.map((u) => u.publicKey) ?? [];

    dispatch(setLoading(true));
    getUsersStateless({
      PublicKeysBase58Check: [
        currentUser.publicKey,
        ...alternateUserKeys,
      ],
      IncludeBalance: true,
    }).then(({ UserList }) => {
      const [currentUser, ...alternateUsers] = UserList;
      dispatch(setCurrentUser({ currentUser, alternateUsers }));
    }).finally(() => {
      dispatch(setLoading(false));
    });
  }
};

export const subscribeIdentity = (): ThunkAction<void, RootState, null, any> => async (dispatch) => {
  identity.subscribe(({ event, currentUser, alternateUsers }) => {
    if (event === NOTIFICATION_EVENTS.AUTHORIZE_DERIVED_KEY_START) {
      dispatch(setLoading(true));
      return;
    }

    if (alternateUsers && !currentUser) {
      const fallbackUser = Object.values(alternateUsers)[0];
      identity.setActiveUser(fallbackUser.publicKey);
      return;
    }

    if (!currentUser) {
      dispatch(initializeUserState());
    } else if (
      currentUser?.publicKey !== currentUser?.PublicKeyBase58Check
    ) {
      dispatch(getUserData());
    }
  });
};

export const store = configureStore({
  reducer: {
    user: userSlice.reducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = (selector: (state: RootState) => any) => useSelector(selector);


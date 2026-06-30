# Test Checklist

## Authentication

- Create an account with email and password.
- Log out and log back in.
- Sign in with Google after enabling the provider.
- Refresh `/profile` and confirm the session remains active.
- Update display name and favourite team.

## Prediction sync

- Log in.
- Change the tournament prediction.
- Wait two seconds.
- Refresh the page and confirm it remains saved.
- Sign in from another browser and confirm the saved prediction is restored.

## Mini Game

- Complete one 30-second round while logged in.
- Open `/profile` and confirm Games, Goals, Best Score and Accuracy update.
- Confirm the existing match and team auto-scroll still works.

## Best XI

- Open `/best-xi` without logging in and confirm squads load.
- Test search, country and position filters.
- Confirm goals, assists, tackles, interceptions or saves appear in player rows when supplied by the feed.
- Select all 11 starters.
- Select 8 substitutes, including at least one goalkeeper.
- Select a manager.
- Change formation and confirm compatible players remain selected.
- Log in and save the team.
- Create up to 5 teams.
- Confirm the sixth new save is blocked.
- Edit and delete a saved team.

## Responsive layouts

Test at:

```text
375px
390px
430px
768px
1024px
1440px
```

Check the pitch, bottom-sheet player picker, substitutes, manager picker, profile menu and navigation.

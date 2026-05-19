from app.motion.planner import plan_motion


def test_plan_motion() -> None:
    assert plan_motion("home") == ["home", "pick", "place"]

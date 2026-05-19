def plan_motion(start_pose: str) -> list[str]:
    return [
        start_pose,
        "pick",
        "place"
    ]

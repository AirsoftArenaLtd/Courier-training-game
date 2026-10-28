# Controller startup diagnostic

The resource controller waited behind the native browser lease. After the prior tool session ended, writing its first progress line to that closed stdout pipe raised BrokenPipeError. No benchmark child started, no resource view was measured and no budget failed. Its server exited and the lease was released. The fresh controller uses a dedicated stdout/stderr log file so it survives tool-session boundaries. Frozen resource inputs are rehashed in the new plan.

// Add this state variable after the other useState declarations
const [hasShownLevelUnlock, setHasShownLevelUnlock] = useState(false);

// Add this function to check and show level unlock notification
const checkAndShowLevelUnlock = async (newUserProgress) => {
  if (hasShownLevelUnlock) return;
  
  const totalProblems = problems.length;
  const completedProblems = Object.keys(newUserProgress).length;
  
  // Check if all problems are completed (25 problems for level 1)
  if (totalProblems > 0 && completedProblems === totalProblems && totalProblems === 25) {
    setHasShownLevelUnlock(true);
    
    try {
      // Trigger celebration fireworks
      triggerFireworks({ duration: 4000, particles: 400 });
      
      // Show the level unlock notification
      const result = await Swal.fire({
        title: 'Congratulations! 🎉🌟',
        html: `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 2.5rem; margin-bottom: 20px;">🎊✨🏆✨🎊</div>
            <div style="font-size: 1.4rem; font-weight: bold; color: #6B46C1; margin-bottom: 15px;">
              You have unlocked Level 1 Test!
            </div>
            <div style="font-size: 1.1rem; color: #555; margin-bottom: 20px;">
              Amazing job completing all 25 problems! 💖<br/>
              You're ready to take your first official test.
            </div>
            <div style="font-size: 1rem; color: #777;">
              Click "Start Level 1 Test" to begin your assessment! 🚀
            </div>
          </div>
        `,
        imageUrl: '/celebrate.gif', // You might want to add a celebration GIF
        imageWidth: 200,
        imageHeight: 150,
        showCancelButton: true,
        confirmButtonText: 'Start Level 1 Test 🚀',
        cancelButtonText: 'Continue Practicing ✏️',
        confirmButtonColor: '#6B46C1',
        cancelButtonColor: '#10B981',
        background: 'linear-gradient(145deg, #FEF7FF 0%, #F3E8FF 100%)',
        customClass: {
          popup: 'level-unlock-popup',
          title: 'level-unlock-title',
          confirmButton: 'level-unlock-confirm',
          cancelButton: 'level-unlock-cancel'
        }
      });

      if (result.isConfirmed) {
        // User wants to go to testing mode - go back to main menu and set testing mode
        onReset(); // This will take them back to main menu where they can see Testing is unlocked
      }
    } catch (error) {
      console.error('Error showing level unlock notification:', error);
    }
  }
};

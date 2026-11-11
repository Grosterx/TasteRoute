package catalog

import "testing"

func TestMaskBlind(t *testing.T) {
	dish := Dish{
		DishID:      "dish-1",
		Name:        "Пельмени с говядиной",
		Description: "Сытная классика",
		Price:       390,
		Tags:        []string{"хит"},
		ImageURL:    "https://example.com/pelmeni.jpg",
		Blind:       true,
		BlindRiddle: "Горячее, в лепёшках из теста, спрятано внутри мясо",
	}

	masked := MaskBlind(dish)
	if masked.Name != blindDishName {
		t.Fatalf("masked name = %q, want %q", masked.Name, blindDishName)
	}
	if masked.Description != dish.BlindRiddle {
		t.Fatalf("masked description = %q, want riddle %q", masked.Description, dish.BlindRiddle)
	}
	if masked.ImageURL != "" {
		t.Fatalf("masked image_url = %q, want empty", masked.ImageURL)
	}
	if len(masked.Tags) != 0 {
		t.Fatalf("masked tags = %v, want empty", masked.Tags)
	}
	if masked.BlindRiddle != "" {
		t.Fatalf("masked blind_riddle = %q, want empty", masked.BlindRiddle)
	}
	if !masked.Blind {
		t.Fatal("masked dish must keep blind flag for the guest UI")
	}
}

func TestMaskBlindKeepsRegularDish(t *testing.T) {
	dish := Dish{
		DishID:      "dish-2",
		Name:        "Паста карбонара",
		Description: "Классика",
		Tags:        []string{"итальянская"},
		ImageURL:    "https://example.com/pasta.jpg",
	}
	masked := MaskBlind(dish)
	if masked.Name != dish.Name ||
		masked.Description != dish.Description ||
		masked.ImageURL != dish.ImageURL ||
		masked.Blind ||
		len(masked.Tags) != len(dish.Tags) {
		t.Fatalf("regular dish must stay unchanged, got %+v", masked)
	}
	if len(masked.Tags) == 1 && masked.Tags[0] != dish.Tags[0] {
		t.Fatalf("regular dish tags must stay unchanged, got %v", masked.Tags)
	}
}

func TestMaskBlindWithoutRiddle(t *testing.T) {
	masked := MaskBlind(Dish{DishID: "dish-3", Name: "Секрет", Blind: true})
	if masked.Description == "" {
		t.Fatal("masked dish without riddle must fall back to the default hint")
	}
}
